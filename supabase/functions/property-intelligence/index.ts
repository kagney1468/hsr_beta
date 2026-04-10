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
    const body = await req.json()
    const { postcode, property_id } = body
    console.log(`[pi] Request received — postcode=${postcode} property_id=${property_id}`)

    if (!postcode || !property_id) {
      return respond({ error: 'postcode and property_id are required' }, 400)
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!
    const epcEmail     = Deno.env.get('EPC_EMAIL')    ?? null
    const epcApiKey    = Deno.env.get('EPC_API_KEY')  ?? null
    const osKey        = Deno.env.get('OS_DATA_HUB_KEY') ?? null
    const hmlrKey      = Deno.env.get('HMLR_API_KEY') ?? null
    const db           = createClient(supabaseUrl, serviceKey)

    console.log(`[pi] EPC credentials present: email=${!!epcEmail} key=${!!epcApiKey}`)
    console.log(`[pi] OS Data Hub key present: ${!!osKey}`)
    console.log(`[pi] HMLR key present: ${!!hmlrKey}`)

    // ── Auth: verify caller owns the property ─────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      console.log('[pi] Auth header present — verifying ownership')
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error: authErr } = await userClient.auth.getUser()

      if (authErr) {
        console.error('[pi] Token verification failed:', authErr.message)
        return respond({ error: 'Unauthorised' }, 401)
      }

      if (user) {
        const { data: publicUser, error: puErr } = await db
          .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        if (puErr) console.warn('[pi] publicUser lookup error (non-fatal):', puErr.message)

        const { data: prop, error: propErr } = await db
          .from('properties').select('id, seller_user_id').eq('id', property_id).maybeSingle()
        if (propErr) console.warn('[pi] property lookup error (non-fatal):', propErr.message)

        if (prop && publicUser && prop.seller_user_id !== publicUser.id) {
          console.error(`[pi] Ownership mismatch — property=${property_id} seller=${prop.seller_user_id} user=${publicUser.id}`)
          return respond({ error: 'Property not found or access denied' }, 403)
        }
        console.log('[pi] Ownership verified for user:', user.id)
      }
    }

    // ── Cache: only use if data is populated and less than 6 hours old ────────
    const { data: cached } = await db
      .from('property_intelligence').select('*').eq('property_id', property_id).maybeSingle()

    if (cached?.last_updated) {
      const hoursOld = (Date.now() - new Date(cached.last_updated).getTime()) / 3_600_000
      const hasData  = !!(cached.flood_risk || cached.crime_statistics || cached.epc)

      if (hoursOld < 6 && hasData) {
        console.log(`[pi] Cache hit for ${property_id} (${hoursOld.toFixed(1)}h old)`)
        const { data: schools } = await db
          .from('nearby_schools').select('*').eq('property_id', property_id).order('distance_miles')
        return respond({ ...cached, schools: schools ?? [] })
      }
      if (!hasData) console.log(`[pi] Cached row has no data — forcing fresh fetch`)
    }

    // ── Resolve postcode → lat/lng ────────────────────────────────────────────
    // Normalise to "AA9 9AA" format (with space) for APIs that require it
    const cleanPostcode    = postcode.replace(/\s+/g, '').toUpperCase()
    const formattedPostcode = cleanPostcode.length > 3
      ? `${cleanPostcode.slice(0, -3)} ${cleanPostcode.slice(-3)}`
      : cleanPostcode
    console.log(`[pi] Resolving postcode: ${formattedPostcode}`)

    const pcRes = await fetch(
      `https://api.postcodes.io/postcodes/${cleanPostcode}`,
      { signal: AbortSignal.timeout(8_000) }
    )
    console.log(`[pi] postcodes.io status: ${pcRes.status}`)
    if (!pcRes.ok) throw new Error(`postcodes.io responded ${pcRes.status} for ${cleanPostcode}`)
    const pcJson = await pcRes.json()
    if (!pcJson.result) throw new Error(`Could not resolve postcode: ${postcode}`)
    const { latitude: lat, longitude: lng } = pcJson.result
    console.log(`[pi] Resolved ${formattedPostcode} → lat=${lat} lng=${lng}`)

    // ── Fetch all sources concurrently ────────────────────────────────────────
    const [
      floodRes,
      crimeRes,
      schoolsRes,
      epcRes,
      osMapRes,
      conservationRes,
      greenSpacesRes,
      hmlrRes,
    ] = await Promise.allSettled([
      fetchFlood(lat, lng),
      fetchCrime(lat, lng),
      fetchSchools(lat, lng),
      fetchEpc(formattedPostcode, epcEmail, epcApiKey),
      fetchOsMap(lat, lng, osKey),
      fetchConservation(lat, lng, osKey),
      fetchGreenSpaces(lat, lng, osKey),
      fetchRestrictiveCovenants(cleanPostcode, hmlrKey),
    ])

    const flood        = floodRes.status         === 'fulfilled' ? floodRes.value         : null
    const crime        = crimeRes.status         === 'fulfilled' ? crimeRes.value         : null
    const schoolsData  = schoolsRes.status       === 'fulfilled' ? schoolsRes.value       : []
    const epc          = epcRes.status           === 'fulfilled' ? epcRes.value           : null
    const osMap        = osMapRes.status         === 'fulfilled' ? osMapRes.value         : null
    const conservation = conservationRes.status  === 'fulfilled' ? conservationRes.value  : null
    const greenSpaces  = greenSpacesRes.status   === 'fulfilled' ? greenSpacesRes.value   : null
    const covenants    = hmlrRes.status          === 'fulfilled' ? hmlrRes.value          : null

    if (floodRes.status        === 'rejected') console.error('[pi] flood failed:',        floodRes.reason?.message        ?? floodRes.reason)
    if (crimeRes.status        === 'rejected') console.error('[pi] crime failed:',        crimeRes.reason?.message        ?? crimeRes.reason)
    if (schoolsRes.status      === 'rejected') console.error('[pi] schools failed:',      schoolsRes.reason?.message      ?? schoolsRes.reason)
    if (epcRes.status          === 'rejected') console.error('[pi] epc failed:',          epcRes.reason?.message          ?? epcRes.reason)
    if (osMapRes.status        === 'rejected') console.error('[pi] os_map failed:',       osMapRes.reason?.message        ?? osMapRes.reason)
    if (conservationRes.status === 'rejected') console.error('[pi] conservation failed:', conservationRes.reason?.message ?? conservationRes.reason)
    if (greenSpacesRes.status  === 'rejected') console.error('[pi] green_spaces failed:', greenSpacesRes.reason?.message  ?? greenSpacesRes.reason)
    if (hmlrRes.status         === 'rejected') console.error('[pi] hmlr failed:',         hmlrRes.reason?.message         ?? hmlrRes.reason)

    console.log(
      `[pi] Results — flood:${!!flood} crime:${!!crime} schools:${schoolsData?.length ?? 0} epc:${!!epc} os_map:${!!osMap} conservation:${!!conservation} green_spaces:${greenSpaces?.length ?? 0} covenants:${!!covenants}`
    )

    const hasAnyData = !!(flood || crime || epc)

    const upsertPayload: Record<string, unknown> = {
      property_id,
      postcode:               formattedPostcode,
      flood_risk:             flood  ? { zone: flood.zone, risk: flood.risk }               : null,
      crime_statistics:       crime  ? { total: crime.total, categories: crime.categories } : null,
      broadband_availability: null,
      broadband_max_speed:    null,
      epc:                    epc          ?? null,
      os_map:                 osMap        ?? null,
      conservation:           conservation ?? null,
      green_spaces:           greenSpaces  ?? null,
      restrictive_covenants:  covenants    ?? null,
      last_updated:           hasAnyData ? new Date().toISOString() : null,
    }

    console.log('[pi] Upserting payload keys:', Object.keys(upsertPayload).join(', '))

    const { data: saved, error: upsertErr } = await db
      .from('property_intelligence')
      .upsert(upsertPayload, { onConflict: 'property_id' })
      .select()
      .single()

    if (upsertErr) {
      console.error('[pi] Upsert failed:', upsertErr.message, upsertErr.details)
      throw upsertErr
    }
    console.log('[pi] Upsert successful, id:', saved?.id)

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
      console.log(`[pi] Saved ${savedSchools.length} schools`)
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
  console.log(`[pi:flood] GET ${url}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  console.log(`[pi:flood] status=${res.status}`)
  if (!res.ok) throw new Error(`Flood API responded ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : []
  console.log(`[pi:flood] ${items.length} flood area(s) found`)

  let zone = 'Zone 1'
  let risk  = 'Very Low'
  if      (items.length >= 3) { zone = 'Zone 3'; risk = 'High'   }
  else if (items.length >= 1) { zone = 'Zone 2'; risk = 'Medium' }

  return { zone, risk }
}

async function fetchCrime(lat: number, lng: number) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`
  console.log(`[pi:crime] GET ${url}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  console.log(`[pi:crime] status=${res.status}`)
  if (!res.ok) throw new Error(`Crime API responded ${res.status}`)
  const crimes = await res.json()
  if (!Array.isArray(crimes)) {
    console.error('[pi:crime] Unexpected response shape:', JSON.stringify(crimes).slice(0, 200))
    throw new Error(`Unexpected crime API shape`)
  }
  console.log(`[pi:crime] ${crimes.length} crime(s) returned`)

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

async function fetchSchools(lat: number, lng: number) {
  // GIAS (Get Information About Schools) — correct API endpoint
  // radiusInMiles filter via bounding box; statusCode=1 = Open schools only
  const url = `https://api.get-information-schools.service.gov.uk/Establishments/search`
    + `?filters.typeOfEstablishment=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18`
    + `&filters.statusCode=1`
    + `&point.lat=${lat}&point.lon=${lng}&point.radius=1609`  // 1 mile in metres
    + `&take=20`
  console.log(`[pi:schools] GET GIAS search`)
  const res = await fetch(url, {
    headers: {
      Accept:       'application/json',
      'User-Agent': 'HomeSalesReady/2.0',
    },
    signal: AbortSignal.timeout(15_000),
  })
  console.log(`[pi:schools] status=${res.status}`)

  if (!res.ok) {
    // Fallback: try the legacy Edubase-style endpoint
    console.log(`[pi:schools] Primary endpoint failed (${res.status}), trying fallback`)
    return await fetchSchoolsFallback(lat, lng)
  }

  const data = await res.json()
  console.log(`[pi:schools] top-level keys: ${Object.keys(data ?? {}).join(', ')}`)

  // GIAS returns { Establishments: [...] }
  const list: unknown[] =
    Array.isArray(data?.Establishments)  ? data.Establishments :
    Array.isArray(data?.establishments)  ? data.establishments :
    Array.isArray(data?.results)         ? data.results :
    Array.isArray(data?.data)            ? data.data :
    Array.isArray(data)                  ? data :
    []

  console.log(`[pi:schools] ${list.length} school(s) found`)
  if (list.length === 0) return await fetchSchoolsFallback(lat, lng)

  return mapSchools(list, lat, lng)
}

async function fetchSchoolsFallback(lat: number, lng: number) {
  // Fallback: use the open data CSV-style endpoint via API
  const url = `https://get-information-schools.service.gov.uk/api/schools/search`
    + `?lat=${lat}&lon=${lng}&radiusInMiles=1&statusCode=1`
  console.log(`[pi:schools:fallback] GET ${url}`)
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'HomeSalesReady/2.0' },
    signal: AbortSignal.timeout(12_000),
  })
  console.log(`[pi:schools:fallback] status=${res.status}`)
  if (!res.ok) throw new Error(`Schools API responded ${res.status}`)

  const data = await res.json()
  const list: unknown[] =
    Array.isArray(data)                  ? data :
    Array.isArray(data?.schools)         ? data.schools :
    Array.isArray(data?.Establishments)  ? data.Establishments :
    Array.isArray(data?.data)            ? data.data :
    []

  console.log(`[pi:schools:fallback] ${list.length} school(s) found`)
  return mapSchools(list, lat, lng)
}

function mapSchools(list: unknown[], lat: number, lng: number) {
  return list.slice(0, 10).map((s: unknown) => {
    const school  = s as Record<string, unknown>

    // Distance — GIAS returns metres in Distance field
    const rawDist = school.Distance ?? school.distance ?? null
    let distMiles: number | null = null
    if (rawDist != null) {
      const rawNum = Number(rawDist)
      // If value looks like it's already in miles (< 20) leave it; else convert from metres
      distMiles = rawNum < 20
        ? Math.round(rawNum * 10) / 10
        : Math.round((rawNum / 1609.34) * 10) / 10
    }

    // Type — may be nested object or string
    const typeObj    = school.TypeOfEstablishment as Record<string, unknown> | undefined
    const typeString = typeObj?.DisplayName ?? typeObj?.Name ?? school.type ?? ''

    // Phase — may be nested object or string
    const phaseObj    = school.PhaseOfEducation as Record<string, unknown> | undefined
    const phaseString = phaseObj?.DisplayName ?? phaseObj?.Name ?? school.phase ?? ''

    // Address — prefer Street/Town or fallback to address field
    const addressParts = [
      school.Street ?? school.address,
      school.Town   ?? school.town,
    ].filter(Boolean)

    return {
      name:     school.EstablishmentName ?? school.name    ?? 'Unknown School',
      type:     String(typeString),
      phase:    String(phaseString),
      distance: distMiles,
      address:  addressParts.join(', ') || null,
      postcode: school.Postcode ?? school.postcode ?? null,
    }
  })
}

async function fetchEpc(formattedPostcode: string, email: string | null, apiKey: string | null) {
  if (!email || !apiKey) {
    console.log('[pi:epc] Credentials not configured — skipping')
    return null
  }

  // EPC API requires postcode with a space (e.g. "SW1A 1AA")
  const encoded = encodeURIComponent(formattedPostcode)
  const url = `https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encoded}&size=1`
  console.log(`[pi:epc] GET ${url}`)

  const credentials = btoa(`${email}:${apiKey}`)
  const res = await fetch(url, {
    headers: {
      Accept:        'application/json',
      Authorization: `Basic ${credentials}`,
    },
    signal: AbortSignal.timeout(12_000),
  })
  console.log(`[pi:epc] status=${res.status}`)

  if (res.status === 401) {
    console.error('[pi:epc] 401 Unauthorised — check EPC_EMAIL and EPC_API_KEY secrets')
    throw new Error(`EPC API 401 — credentials rejected`)
  }
  if (!res.ok) throw new Error(`EPC API responded ${res.status}`)

  const data = await res.json()
  console.log(`[pi:epc] top-level keys: ${Object.keys(data ?? {}).join(', ')}`)

  // Response has columnar format: { "column-names": [...], "rows": [[...], ...] }
  const columns: string[] = data?.['column-names'] ?? []
  const rows: unknown[][]  = data?.rows ?? []

  console.log(`[pi:epc] ${rows.length} row(s), columns sample: ${columns.slice(0, 8).join(', ')}`)

  if (rows.length === 0) {
    console.log(`[pi:epc] No EPC records found for postcode: ${formattedPostcode}`)
    return null
  }

  const row = rows[0] as string[]
  const get = (col: string) => {
    const idx = columns.indexOf(col)
    return idx >= 0 ? (row[idx] ?? null) : null
  }

  const rating        = get('current-energy-rating')
  const score         = get('current-energy-efficiency')
  const potentialRating = get('potential-energy-rating')
  const potentialScore  = get('potential-energy-efficiency')
  const date          = get('lodgement-date') ?? get('inspection-date')
  const address       = [get('address1'), get('address2'), get('address3')].filter(Boolean).join(', ')
  const propertyType  = get('property-type')
  const builtForm     = get('built-form')
  const totalFloorArea = get('total-floor-area')
  const mainFuel      = get('main-fuel')
  const wallsDesc     = get('walls-description')
  const roofDesc      = get('roof-description')
  const windowsDesc   = get('windows-description')

  if (!rating) {
    console.log('[pi:epc] No energy rating in response — row data:', JSON.stringify(row).slice(0, 200))
    return null
  }

  console.log(`[pi:epc] rating=${rating} score=${score} date=${date}`)

  return {
    rating,
    score:             score          ? Number(score)          : null,
    potential_rating:  potentialRating ?? null,
    potential_score:   potentialScore  ? Number(potentialScore) : null,
    date:              date            ?? null,
    address:           address         || null,
    property_type:     propertyType    ?? null,
    built_form:        builtForm       ?? null,
    total_floor_area:  totalFloorArea  ? Number(totalFloorArea) : null,
    main_fuel:         mainFuel        ?? null,
    walls:             wallsDesc       ?? null,
    roof:              roofDesc        ?? null,
    windows:           windowsDesc     ?? null,
  }
}

// ── HMLR Restrictive Covenants ────────────────────────────────────────────────

async function fetchRestrictiveCovenants(postcode: string, apiKey: string | null) {
  if (!apiKey) {
    console.log('[pi:hmlr] HMLR_API_KEY not configured — skipping')
    return null
  }

  // HMLR uses the Land Registry API — restrictive covenants endpoint
  // The official endpoint is: https://api.landregistry.gov.uk/v1/title_register/{title_number}
  // We first need to find the title number via the property search endpoint
  const titlesUrl = `https://api.landregistry.gov.uk/v1/search/postcode/${encodeURIComponent(postcode)}`
  console.log(`[pi:hmlr] GET title search: ${titlesUrl}`)

  const titlesRes = await fetch(titlesUrl, {
    headers: {
      Accept:        'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(12_000),
  })
  console.log(`[pi:hmlr] title search status=${titlesRes.status}`)

  if (titlesRes.status === 401) {
    console.error('[pi:hmlr] 401 — check HMLR_API_KEY')
    throw new Error('HMLR API 401 — credentials rejected')
  }
  if (titlesRes.status === 404) {
    console.log('[pi:hmlr] No titles found for postcode')
    return { found: false, count: 0, titles: [], note: 'No registered titles found for this postcode.' }
  }
  if (!titlesRes.ok) throw new Error(`HMLR titles API responded ${titlesRes.status}`)

  const titlesData = await titlesRes.json()
  console.log(`[pi:hmlr] titles response keys: ${Object.keys(titlesData ?? {}).join(', ')}`)

  // Response may be { data: [...] } or a direct array
  const titles: unknown[] =
    Array.isArray(titlesData?.data)    ? titlesData.data :
    Array.isArray(titlesData?.results) ? titlesData.results :
    Array.isArray(titlesData)          ? titlesData :
    []

  console.log(`[pi:hmlr] ${titles.length} title(s) found`)

  if (titles.length === 0) {
    return { found: false, count: 0, titles: [], note: 'No registered titles found for this postcode.' }
  }

  // Map titles to summary — full covenant detail requires a per-title fetch
  // which is expensive; return the title numbers and basic tenure for display
  type TitleSummary = {
    title_number: string
    tenure:       string | null
    address:      string | null
    has_covenants: boolean | null
  }

  const summaries: TitleSummary[] = titles.slice(0, 5).map((t: unknown) => {
    const title = t as Record<string, unknown>
    return {
      title_number:  String(title.title_number ?? title.titleNumber ?? title.id ?? ''),
      tenure:        String(title.tenure ?? title.estateInterest ?? ''),
      address:       String(title.address ?? title.propertyAddress ?? ''),
      has_covenants: null, // Would require individual title register fetch
    }
  })

  return {
    found:   true,
    count:   titles.length,
    titles:  summaries,
    note:    'Restrictive covenants, if any, are recorded in the individual title register. Your conveyancer will review these.',
  }
}

// ── OS Data Hub helpers ────────────────────────────────────────────────────────

/** Convert lat/lng to XYZ tile coords at a given zoom level (Web Mercator / EPSG:3857) */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n   = Math.pow(2, zoom)
  const x   = Math.floor((lng + 180) / 360 * n)
  const rad = lat * Math.PI / 180
  const y   = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n)
  return { x, y }
}

/** Inverse tile to NW corner lat/lng */
function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n   = Math.pow(2, zoom)
  const lng = x / n * 360 - 180
  const rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  const lat = rad * 180 / Math.PI
  return { lat, lng }
}

/** Haversine distance in metres */
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── OS Map (WMTS raster tile) ─────────────────────────────────────────────────

async function fetchOsMap(lat: number, lng: number, osKey: string | null) {
  if (!osKey) {
    console.log('[pi:os_map] OS_DATA_HUB_KEY not configured — skipping')
    return null
  }

  const zoom = 15
  const { x, y } = latLngToTile(lat, lng, zoom)

  // Calculate pin position as percentage within the tile
  const nw   = tileToLatLng(x,     y,     zoom)
  const se   = tileToLatLng(x + 1, y + 1, zoom)
  const pinX = ((lng - nw.lng) / (se.lng - nw.lng)) * 100
  const pinY = ((lat - nw.lat) / (se.lat - nw.lat)) * 100

  // OS Data Hub WMTS — Road_3857 is more reliable for general use than Outdoor_3857
  // Both use the same EPSG:3857 tile matrix set
  const url = `https://api.os.uk/maps/raster/v1/wmts?key=${osKey}`
    + `&service=WMTS&request=GetTile&version=1.0.0`
    + `&layer=Road_3857&style=default`
    + `&tileMatrixSet=EPSG:3857&tileMatrix=EPSG:3857:${zoom}`
    + `&tileRow=${y}&tileCol=${x}`
    + `&format=image/png`

  console.log(`[pi:os_map] GET tile z=${zoom} x=${x} y=${y}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  console.log(`[pi:os_map] status=${res.status}`)

  if (res.status === 401 || res.status === 403) {
    console.error(`[pi:os_map] ${res.status} — check OS_DATA_HUB_KEY and WMTS plan`)
    throw new Error(`OS WMTS responded ${res.status} — check API key and plan`)
  }
  if (!res.ok) throw new Error(`OS WMTS responded ${res.status}`)

  const arrayBuf = await res.arrayBuffer()
  const bytes    = new Uint8Array(arrayBuf)
  let binary     = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64   = btoa(binary)

  console.log(`[pi:os_map] Tile fetched, ${bytes.length} bytes, base64 length=${base64.length}`)

  return {
    zoom,
    tile_x:       x,
    tile_y:       y,
    pin_x_pct:    Math.round(pinX * 10) / 10,
    pin_y_pct:    Math.round(pinY * 10) / 10,
    image_base64: base64,
  }
}

// ── Conservation & Listed Buildings (WFS Zoomstack_Sites) ─────────────────────

async function fetchConservation(lat: number, lng: number, osKey: string | null) {
  if (!osKey) {
    console.log('[pi:conservation] OS_DATA_HUB_KEY not configured — skipping')
    return null
  }

  // ~700m bounding box
  const delta  = 0.007
  const bbox   = `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`
  const url    = `https://api.os.uk/features/v1/wfs`
    + `?key=${osKey}`
    + `&service=WFS&request=GetFeature`
    + `&typeNames=Zoomstack_Sites`
    + `&outputFormat=application/json`
    + `&bbox=${bbox}`
    + `&count=100`

  console.log(`[pi:conservation] GET WFS Zoomstack_Sites`)
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  console.log(`[pi:conservation] status=${res.status}`)

  if (res.status === 401 || res.status === 403) {
    console.error(`[pi:conservation] ${res.status} — check OS_DATA_HUB_KEY and Features API plan`)
    throw new Error(`OS WFS responded ${res.status} — check API key`)
  }
  if (!res.ok) throw new Error(`OS WFS (Sites) responded ${res.status}`)

  const data = await res.json()
  const features: unknown[] = data?.features ?? []
  console.log(`[pi:conservation] ${features.length} site feature(s) returned`)

  let conservationArea = false
  const listedBuildings: { name: string; type: string; distance_m: number }[] = []

  for (const f of features) {
    const feat  = f as Record<string, unknown>
    const props = feat.properties as Record<string, unknown> | null
    if (!props) continue

    const name = String(props.name ?? props.Name ?? props.NAME ?? '').trim()
    const type = String(props.type ?? props.Type ?? props.TYPE ?? props.featureType ?? '').trim().toLowerCase()

    const geom = feat.geometry as Record<string, unknown> | null
    let featLat = lat
    let featLng = lng
    if (geom?.type === 'Point') {
      const coords = geom.coordinates as number[]
      featLng = coords[0]
      featLat = coords[1]
    }
    const distM = Math.round(haversineMetres(lat, lng, featLat, featLng))

    if (type.includes('conservation')) {
      conservationArea = true
    }

    if (
      type.includes('listed') ||
      type.includes('historic') ||
      type.includes('heritage') ||
      type.includes('monument') ||
      type.includes('scheduled')
    ) {
      if (name) {
        listedBuildings.push({ name, type: formatType(type), distance_m: distM })
      }
    }
  }

  listedBuildings.sort((a, b) => a.distance_m - b.distance_m)

  console.log(`[pi:conservation] conservation_area=${conservationArea} listed_buildings=${listedBuildings.length}`)

  return {
    conservation_area: conservationArea,
    listed_buildings:  listedBuildings.slice(0, 10),
    feature_count:     features.length,
  }
}

// ── Green Spaces (WFS Zoomstack_Greenspace) ───────────────────────────────────

async function fetchGreenSpaces(lat: number, lng: number, osKey: string | null) {
  if (!osKey) {
    console.log('[pi:green_spaces] OS_DATA_HUB_KEY not configured — skipping')
    return null
  }

  // ~800m bounding box
  const delta  = 0.008
  const bbox   = `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`
  const url    = `https://api.os.uk/features/v1/wfs`
    + `?key=${osKey}`
    + `&service=WFS&request=GetFeature`
    + `&typeNames=Zoomstack_Greenspace`
    + `&outputFormat=application/json`
    + `&bbox=${bbox}`
    + `&count=50`

  console.log(`[pi:green_spaces] GET WFS Zoomstack_Greenspace`)
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  console.log(`[pi:green_spaces] status=${res.status}`)

  if (res.status === 401 || res.status === 403) {
    console.error(`[pi:green_spaces] ${res.status} — check OS_DATA_HUB_KEY and Features API plan`)
    throw new Error(`OS WFS responded ${res.status} — check API key`)
  }
  if (!res.ok) throw new Error(`OS WFS (Greenspace) responded ${res.status}`)

  const data = await res.json()
  const features: unknown[] = data?.features ?? []
  console.log(`[pi:green_spaces] ${features.length} greenspace feature(s) returned`)

  type GreenSpace = { name: string; type: string; distance_m: number }
  const results: GreenSpace[] = []

  for (const f of features) {
    const feat  = f as Record<string, unknown>
    const props = feat.properties as Record<string, unknown> | null
    if (!props) continue

    const name = String(props.name ?? props.Name ?? props.NAME ?? '').trim()
    const type = String(props.type ?? props.Type ?? props.TYPE ?? props.function ?? '').trim()

    const geom = feat.geometry as Record<string, unknown> | null
    let featLat = lat
    let featLng = lng

    if (geom?.type === 'Point') {
      const coords = geom.coordinates as number[]
      featLng = coords[0]
      featLat = coords[1]
    } else if (geom?.type === 'Polygon') {
      const ring = (geom.coordinates as number[][][])[0] ?? []
      if (ring.length > 0) {
        featLng = ring.reduce((s, c) => s + c[0], 0) / ring.length
        featLat = ring.reduce((s, c) => s + c[1], 0) / ring.length
      }
    } else if (geom?.type === 'MultiPolygon') {
      const ring = ((geom.coordinates as number[][][][])[0]?.[0]) ?? []
      if (ring.length > 0) {
        featLng = ring.reduce((s, c) => s + c[0], 0) / ring.length
        featLat = ring.reduce((s, c) => s + c[1], 0) / ring.length
      }
    }

    const distM = Math.round(haversineMetres(lat, lng, featLat, featLng))

    if (!name && results.length >= 5) continue

    results.push({
      name:       name || formatType(type) || 'Green Space',
      type:       formatType(type),
      distance_m: distM,
    })
  }

  // Deduplicate by name, keep closest
  const seen   = new Map<string, GreenSpace>()
  for (const gs of results) {
    const key = gs.name.toLowerCase()
    if (!seen.has(key) || gs.distance_m < seen.get(key)!.distance_m) {
      seen.set(key, gs)
    }
  }

  const sorted = [...seen.values()]
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, 5)

  console.log(`[pi:green_spaces] Returning ${sorted.length} green space(s)`)
  return sorted
}

// ── Utility ────────────────────────────────────────────────────────────────────

function formatType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
