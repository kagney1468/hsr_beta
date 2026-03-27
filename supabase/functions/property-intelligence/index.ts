import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { postcode, property_id } = await req.json()

    if (!postcode || !property_id) {
      return new Response(
        JSON.stringify({ error: 'postcode and property_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the requesting user has access to this property via RLS
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: propCheck } = await userClient
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .maybeSingle()

      if (!propCheck) {
        return new Response(
          JSON.stringify({ error: 'Property not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check cache — return if fetched within last 24 hours
    const { data: existing } = await supabase
      .from('property_intelligence')
      .select('*')
      .eq('property_id', property_id)
      .maybeSingle()

    if (existing?.data_fetched_at) {
      const hoursOld = (Date.now() - new Date(existing.data_fetched_at).getTime()) / 3_600_000
      if (hoursOld < 24) {
        const { data: schools } = await supabase
          .from('nearby_schools')
          .select('*')
          .eq('property_id', property_id)
          .order('distance_miles')
        return new Response(
          JSON.stringify({ ...existing, schools: schools ?? [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Resolve coordinates via postcodes.io
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase()
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`)
    const pcJson = await pcRes.json()
    if (!pcJson.result) throw new Error(`Could not resolve postcode: ${postcode}`)
    const { latitude: lat, longitude: lng } = pcJson.result

    // Call all five APIs in parallel; never let one failure block the rest
    const [floodResult, crimeResult, broadbandResult, salesResult, schoolsResult] =
      await Promise.allSettled([
        fetchFlood(lat, lng),
        fetchCrime(lat, lng),
        fetchBroadband(postcode),
        fetchSales(postcode),
        fetchSchools(postcode),
      ])

    const flood    = floodResult.status    === 'fulfilled' ? floodResult.value    : null
    const crime    = crimeResult.status    === 'fulfilled' ? crimeResult.value    : null
    const broadband = broadbandResult.status === 'fulfilled' ? broadbandResult.value : null
    const sales    = salesResult.status    === 'fulfilled' ? salesResult.value    : null
    const schoolsData = schoolsResult.status === 'fulfilled' ? schoolsResult.value : []

    const names = ['flood', 'crime', 'broadband', 'sales', 'schools']
    ;[floodResult, crimeResult, broadbandResult, salesResult, schoolsResult].forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[property-intelligence] ${names[i]} API failed:`, r.reason?.message ?? r.reason)
      }
    })

    // Upsert property_intelligence row
    const upsertPayload: Record<string, unknown> = {
      property_id,
      flood_zone:              flood?.zone    ?? null,
      flood_risk_score:        flood?.risk    ?? null,
      broadband_max_speed_mbps: broadband?.maxSpeed   ?? null,
      broadband_availability:  broadband?.technology  ?? null,
      crime_rate:    crime?.total != null ? String(crime.total) : null,
      crime_category: crime?.categories ? JSON.stringify(crime.categories) : null,
      recent_sales:  sales ?? null,
      data_fetched_at: new Date().toISOString(),
    }

    const { data: saved, error: upsertErr } = await supabase
      .from('property_intelligence')
      .upsert(upsertPayload, { onConflict: 'property_id' })
      .select()
      .single()

    if (upsertErr) throw upsertErr

    // Save schools: delete old rows then insert fresh ones
    if (Array.isArray(schoolsData) && schoolsData.length > 0) {
      await supabase.from('nearby_schools').delete().eq('property_id', property_id)
      await supabase.from('nearby_schools').insert(
        schoolsData.slice(0, 10).map((s: Record<string, unknown>) => ({
          property_id,
          school_name:         s.name,
          school_type:         s.type,
          phase:               s.phase,
          ofsted_rating:       s.ofstedRating,
          ofsted_rating_label: s.ofstedLabel,
          distance_miles:      s.distance,
          address:             s.address,
          postcode:            s.postcode,
        }))
      )
    }

    const { data: schools } = await supabase
      .from('nearby_schools')
      .select('*')
      .eq('property_id', property_id)
      .order('distance_miles')

    return new Response(
      JSON.stringify({ ...saved, schools: schools ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[property-intelligence] Fatal error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchFlood(lat: number, lng: number) {
  const url = `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Flood API responded ${res.status}`)
  const json = await res.json()
  const items = Array.isArray(json?.items) ? json.items : []
  const count = items.length

  let zone = 'Zone 1'
  let risk  = 'Very Low'
  if (count >= 3)      { zone = 'Zone 3'; risk = 'High'   }
  else if (count >= 1) { zone = 'Zone 2'; risk = 'Medium' }

  return { zone, risk, count }
}

async function fetchCrime(lat: number, lng: number) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Crime API responded ${res.status}`)
  const crimes = await res.json()
  if (!Array.isArray(crimes)) throw new Error('Unexpected crime API response shape')

  const total = crimes.length
  const counts: Record<string, number> = {}
  for (const c of crimes) {
    if (c?.category) counts[c.category] = (counts[c.category] ?? 0) + 1
  }

  const categories = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name: name.replace(/-/g, ' '), count }))

  return { total, categories }
}

async function fetchBroadband(postcode: string) {
  const url = `https://api.ofcom.org.uk/broadband-coverage?postcode=${encodeURIComponent(postcode.trim())}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Broadband API responded ${res.status}`)
  const json = await res.json()

  const maxSpeed =
    json?.MaxDownloadSpeed ??
    json?.maxDownloadSpeed ??
    json?.max_download_speed ??
    null

  const technology =
    json?.Technology ??
    json?.technology ??
    json?.ConnectionType ??
    json?.connectionType ??
    null

  return {
    maxSpeed:   maxSpeed   != null ? Number(maxSpeed)  : null,
    technology: technology != null ? String(technology) : null,
  }
}

async function fetchSales(postcode: string) {
  const url =
    `https://landregistry.data.gov.uk/data/ppi/transaction-record.json` +
    `?propertyAddress.postcode=${encodeURIComponent(postcode.trim())}` +
    `&_pageSize=5&_sort=-transactionDate`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Land Registry API responded ${res.status}`)
  const json = await res.json()

  const items: unknown[] =
    (json?.result?.items) ??
    (json?.result?.primaryTopic?.items) ??
    (json?.items) ??
    []

  if (!Array.isArray(items)) return []

  return items
    .slice(0, 5)
    .map((item: unknown) => {
      const i = item as Record<string, unknown>
      const price = i.pricePaid
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

async function fetchSchools(postcode: string) {
  const url =
    `https://www.get-information-schools.service.gov.uk/api/schools` +
    `?postcode=${encodeURIComponent(postcode.trim())}&radiusInMiles=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Schools API responded ${res.status}`)
  const json = await res.json()

  const list: unknown[] =
    Array.isArray(json) ? json :
    Array.isArray(json?.schools) ? json.schools :
    Array.isArray(json?.Establishments) ? json.Establishments :
    []

  const ofstedLabels: Record<string, string> = {
    '1': 'Outstanding',
    '2': 'Good',
    '3': 'Requires Improvement',
    '4': 'Inadequate',
  }

  return list.slice(0, 8).map((s: unknown) => {
    const school = s as Record<string, unknown>
    const ratingCode = (school.OfstedRating as Record<string, unknown>)?.Code
    const ratingStr  = ratingCode != null ? String(ratingCode) : (school.ofstedRating as string | null) ?? null

    return {
      name:         school.EstablishmentName ?? school.name ?? 'Unknown School',
      type:         (school.TypeOfEstablishment as Record<string, unknown>)?.DisplayName ?? school.type ?? '',
      phase:        (school.PhaseOfEducation  as Record<string, unknown>)?.DisplayName ?? school.phase ?? '',
      ofstedRating: ratingStr,
      ofstedLabel:  ratingStr ? (ofstedLabels[ratingStr] ?? ratingStr) : null,
      distance:     school.Distance ?? school.distance ?? null,
      address:      school.Street   ?? school.address  ?? null,
      postcode:     school.Postcode ?? school.postcode  ?? null,
    }
  })
}
