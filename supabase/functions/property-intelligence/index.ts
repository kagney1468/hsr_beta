import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { postcode, property_id } = await req.json()
    if (!postcode || !property_id) {
      return respond({ error: 'postcode and property_id are required' }, 400)
    }

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const db             = createClient(supabaseUrl, serviceKey)

    // ── Auth: verify caller owns the property ───────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error: authErr } = await userClient.auth.getUser()
      if (authErr || !user) return respond({ error: 'Unauthorised' }, 401)

      const { data: publicUser } = await db
        .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()

      const { data: prop } = await db
        .from('properties').select('id, seller_user_id').eq('id', property_id).maybeSingle()

      if (!prop || !publicUser || prop.seller_user_id !== publicUser.id) {
        console.error(`[pi] Access denied — property=${property_id} seller=${prop?.seller_user_id} user=${publicUser?.id}`)
        return respond({ error: 'Property not found or access denied' }, 403)
      }
    }

    // ── Cache: only use if data is populated and less than 6 hours old ───────
    const { data: cached } = await db
      .from('property_intelligence').select('*').eq('property_id', property_id).maybeSingle()

    if (cached?.last_updated) {
      const hoursOld = (Date.now() - new Date(cached.last_updated).getTime()) / 3_600_000
      const hasData  = !!(cached.flood_risk || cached.crime_statistics || cached.recent_sales?.length)

      if (hoursOld < 6 && hasData) {
        console.log(`[pi] Cache hit for ${property_id} (${hoursOld.toFixed(1)}h old)`)
        const { data: schools } = await db
          .from('nearby_schools').select('*').eq('property_id', property_id).order('distance_miles')
        return respond({ ...cached, schools: schools ?? [] })
      }

      if (!hasData) {
        console.log(`[pi] Cached row has no data — forcing fresh fetch for ${property_id}`)
      }
    }

    // ── Resolve postcode → lat/lng ────────────────────────────────────────────
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase()
    console.log(`[pi] Fetching fresh data for postcode=${cleanPostcode} property=${property_id}`)

    const pcRes = await fetch(
      `https://api.postcodes.io/postcodes/${cleanPostcode}`,
      { signal: AbortSignal.timeout(8_000) }
    )
    if (!pcRes.ok) throw new Error(`postcodes.io responded ${pcRes.status} for ${cleanPostcode}`)
    const pcJson = await pcRes.json()
    if (!pcJson.result) throw new Error(`Could not resolve postcode: ${postcode}`)
    const { latitude: lat, longitude: lng } = pcJson.result
    console.log(`[pi] Resolved ${cleanPostcode} → lat=${lat} lng=${lng}`)

    // ── Fetch all sources concurrently ────────────────────────────────────────
    // Broadband (Ofcom) and EPC are omitted here — they require API keys that
    // are not yet configured. Add them back once keys are available.
    const [floodRes, crimeRes, salesRes, schoolsRes] = await Promise.allSettled([
      fetchFlood(lat, lng),
      fetchCrime(lat, lng),
      fetchSales(postcode),   // original postcode (may include space) works best with Land Registry
      fetchSchools(lat, lng),
    ])

    const flood       = floodRes.status   === 'fulfilled' ? floodRes.value   : null
    const crime       = crimeRes.status   === 'fulfilled' ? crimeRes.value   : null
    const sales       = salesRes.status   === 'fulfilled' ? salesRes.value   : null
    const schoolsData = schoolsRes.status === 'fulfilled' ? schoolsRes.value : []

    // Log individual failures so they're visible in Supabase Edge Function logs
    if (floodRes.status   === 'rejected') console.error('[pi] flood failed:',   floodRes.reason?.message   ?? floodRes.reason)
    if (crimeRes.status   === 'rejected') console.error('[pi] crime failed:',   crimeRes.reason?.message   ?? crimeRes.reason)
    if (salesRes.status   === 'rejected') console.error('[pi] sales failed:',   salesRes.reason?.message   ?? salesRes.reason)
    if (schoolsRes.status === 'rejected') console.error('[pi] schools failed:', schoolsRes.reason?.message ?? schoolsRes.reason)

    console.log(
      `[pi] Results — flood:${!!flood} crime:${!!crime} sales:${sales?.length ?? 0} schools:${schoolsData?.length ?? 0}`
    )

    // Only set data_fetched_at if we actually got something useful.
    // Leaving it null means the next request will retry instead of serving empty cache.
    const hasAnyData = !!(flood || crime || (sales && sales.length > 0))

    const upsertPayload: Record<string, unknown> = {
      property_id,
      postcode:              cleanPostcode,
      flood_risk:            flood  ? { zone: flood.zone, risk: flood.risk }                         : null,
      crime_statistics:      crime  ? { total: crime.total, categories: crime.categories }           : null,
      broadband_availability: null,   // populated once Ofcom key is configured
      broadband_max_speed:   null,    // populated once Ofcom key is configured
      recent_sales:          sales ?? null,
      last_updated:          hasAnyData ? new Date().toISOString() : null,
    }

    const { data: saved, error: upsertErr } = await db
      .from('property_intelligence')
      .upsert(upsertPayload, { onConflict: 'property_id' })
      .select()
      .single()

    if (upsertErr) {
      console.error('[pi] Upsert failed:', upsertErr.message)
      throw upsertErr
    }

    // Save schools (delete-then-insert to avoid stale rows)
    let savedSchools: unknown[] = []
    if (Array.isArray(schoolsData) && schoolsData.length > 0) {
      await db.from('nearby_schools').delete().eq('property_id', property_id)
      await db.from('nearby_schools').insert(
        schoolsData.slice(0, 10).map((s) => ({
          property_id,
          school_name:         s.name,
          school_type:         s.type,
          phase:               s.phase,
          ofsted_rating:       null,
          ofsted_rating_label: null,
          distance_miles:      s.distance,
          address:             s.address,
          postcode:            s.postcode,
        }))
      )
      const { data: schools } = await db
        .from('nearby_schools').select('*').eq('property_id', property_id).order('distance_miles')
      savedSchools = schools ?? []
    }

    return respond({ ...saved, schools: savedSchools })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[pi] Fatal:', msg)
    return respond({ error: msg }, 500)
  }
})

// ── API fetchers ──────────────────────────────────────────────────────────────

async function fetchFlood(lat: number, lng: number) {
  const url = `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!res.ok) throw new Error(`Flood API responded ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : []

  let zone = 'Zone 1'
  let risk  = 'Very Low'
  if      (items.length >= 3) { zone = 'Zone 3'; risk = 'High'   }
  else if (items.length >= 1) { zone = 'Zone 2'; risk = 'Medium' }

  return { zone, risk }
}

async function fetchCrime(lat: number, lng: number) {
  // Police UK returns the most recent available month by default
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Crime API responded ${res.status}`)
  const crimes = await res.json()
  if (!Array.isArray(crimes)) throw new Error(`Unexpected crime API shape: ${JSON.stringify(crimes).slice(0, 100)}`)

  const total = crimes.length
  const counts: Record<string, number> = {}
  for (const c of crimes) {
    if (c?.category) counts[c.category] = (counts[c.category] ?? 0) + 1
  }

  const categories = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.replace(/-/g, ' '), count }))

  return { total, categories }
}

async function fetchSales(postcode: string) {
  // Land Registry Linked Data API — postcode with space is accepted
  const encoded = encodeURIComponent(postcode.trim())
  const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encoded}&_pageSize=5&_sort=-transactionDate`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Land Registry responded ${res.status}`)
  const data = await res.json()

  const items: unknown[] =
    data?.result?.items ??
    data?.result?.primaryTopic?.items ??
    data?.items ??
    []

  if (!Array.isArray(items) || items.length === 0) return []

  return items
    .slice(0, 5)
    .map((item: unknown) => {
      const i       = item as Record<string, unknown>
      const price   = i.pricePaid
      const rawDate = (i.transactionDate as Record<string, unknown>)?.['@value'] ?? i.transactionDate
      const typeObj = i.propertyType as Record<string, unknown> | undefined
      const type    = typeObj?.label ?? typeObj?.['@id']?.toString().split('/').pop() ?? null
      return {
        price: price != null ? Number(price) : null,
        date:  rawDate ? String(rawDate) : null,
        type:  type    ? String(type)    : null,
      }
    })
    .filter((s) => s.price != null && s.price > 0)
}

async function fetchSchools(lat: number, lng: number) {
  // DfE Get Information About Schools — open schools within 1 mile
  const url = `https://get-information-schools.service.gov.uk/api/schools/search?lat=${lat}&lon=${lng}&radiusInMiles=1&statusCode=1`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'HomeSalesReady/1.0' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Schools API responded ${res.status}`)
  const data = await res.json()

  const list: unknown[] =
    Array.isArray(data)                  ? data :
    Array.isArray(data?.schools)         ? data.schools :
    Array.isArray(data?.Establishments)  ? data.Establishments :
    Array.isArray(data?.data)            ? data.data :
    []

  console.log(`[pi] Schools API returned ${list.length} results`)

  return list.slice(0, 10).map((s: unknown) => {
    const school    = s as Record<string, unknown>
    const rawDist   = school.Distance ?? school.distance ?? null
    const distMiles = rawDist != null ? Math.round((Number(rawDist) / 1609.34) * 10) / 10 : null

    return {
      name:     school.EstablishmentName ?? school.name    ?? 'Unknown School',
      type:     (school.TypeOfEstablishment as Record<string, unknown>)?.DisplayName ?? school.type  ?? '',
      phase:    (school.PhaseOfEducation   as Record<string, unknown>)?.DisplayName ?? school.phase ?? '',
      distance: distMiles,
      address:  school.Street   ?? school.address  ?? null,
      postcode: school.Postcode ?? school.postcode ?? null,
    }
  })
}
