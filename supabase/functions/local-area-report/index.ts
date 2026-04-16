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
    const { postcode, address, propertyId } = await req.json()
    console.log(`[lar] Request — postcode=${postcode} propertyId=${propertyId}`)

    if (!postcode) return respond({ error: 'postcode is required' }, 400)

    const geminiKey = Deno.env.get('HOME_CHECK')
    if (!geminiKey) {
      console.error('[lar] HOME_CHECK secret not configured')
      return respond({ error: 'Area report service is not configured' }, 500)
    }

    // Normalise postcode to "AA9 9AA" format
    const clean     = postcode.replace(/\s+/g, '').toUpperCase()
    const formatted = clean.length > 3
      ? `${clean.slice(0, -3)} ${clean.slice(-3)}`
      : clean

    const addressLine = address ? `${address}, ${formatted}` : formatted

    // ── Build Gemini prompt ───────────────────────────────────────────────────

    const prompt = `You are a UK property research assistant with expert knowledge of local areas.
Generate a detailed local area report for the property at: ${addressLine}

Return ONLY a valid JSON object — no markdown, no code fences, no commentary.
The JSON must match this exact structure (all fields required):

{
  "address": "${addressLine}",
  "postcode": "${formatted}",
  "summary": "2–3 sentence overview of what it is like to live here, key selling points for buyers",
  "broadband": {
    "providers": ["array of ISPs likely available at this postcode, e.g. BT, Sky, Virgin Media"],
    "maxSpeed": "e.g. 1000 Mbps",
    "uploadSpeed": "e.g. 100 Mbps",
    "fiberAvailable": true,
    "description": "one sentence about broadband quality and availability in this area"
  },
  "floodRisk": {
    "riskLevel": "Very Low | Low | Medium | High",
    "details": "one sentence describing the flood risk context for this specific area"
  },
  "crime": {
    "level": "Low | Medium | High",
    "recentStats": "one sentence summarising recent crime levels, e.g. 'Below average crime rate for the region'",
    "commonTypes": ["array of 3–5 most common crime categories in this area"]
  },
  "schools": [
    { "name": "real school name if known", "type": "Primary | Secondary | Academy etc.", "ofstedRating": "Outstanding | Good | Requires Improvement | Inadequate | Not rated", "distance": "e.g. 0.3 miles" }
  ],
  "transport": [
    { "name": "station or stop name", "type": "Train Station | Bus Stop | Tube Station | Tram Stop etc.", "distance": "e.g. 0.4 miles" }
  ],
  "shops": [
    { "name": "real retailer name if known", "type": "Supermarket | Convenience Store | Retail Park etc.", "distance": "e.g. 0.2 miles" }
  ],
  "healthcare": [
    { "name": "practice or hospital name if known", "type": "GP Surgery | Hospital | Pharmacy | Dental Practice etc.", "distance": "e.g. 0.5 miles" }
  ],
  "gyms": [
    { "name": "gym name if known", "type": "Gym | Leisure Centre | Yoga Studio etc.", "distance": "e.g. 0.7 miles" }
  ]
}

Rules:
- Use real place names where you have knowledge of the postcode area
- Provide 3–6 items in each array
- Distances should be realistic walking or short driving distances in miles
- If you have limited knowledge of an exact postcode, use the wider town/area as context
- broadband speeds should reflect what is realistically available in that type of UK area
- Be positive but accurate — this is a buyer-facing report`

    // ── Call Gemini ───────────────────────────────────────────────────────────

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`

    console.log(`[lar] Calling Gemini for ${formatted}`)

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:      0.2,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(30_000),
    })

    console.log(`[lar] Gemini status=${geminiRes.status}`)

    if (geminiRes.status === 401 || geminiRes.status === 403) {
      const body = await geminiRes.json().catch(() => ({}))
      console.error('[lar] Gemini auth error:', JSON.stringify(body))
      return respond({ error: 'HOME_CHECK API key is invalid or unauthorised' }, 500)
    }

    if (geminiRes.status === 400) {
      const body = await geminiRes.json().catch(() => ({}))
      console.error('[lar] Gemini 400:', JSON.stringify(body))
      return respond({ error: 'Area report request invalid: ' + (body?.error?.message ?? 'unknown') }, 500)
    }

    if (!geminiRes.ok) {
      console.error(`[lar] Gemini unexpected status ${geminiRes.status}`)
      return respond({ error: `Area report service responded ${geminiRes.status}` }, 500)
    }

    const geminiData = await geminiRes.json()
    const rawText   = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    console.log(`[lar] Raw response length=${rawText.length}`)

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason
      console.error('[lar] Empty response, finishReason:', finishReason)
      return respond({ error: 'Area report service returned an empty response' }, 500)
    }

    // ── Parse JSON ────────────────────────────────────────────────────────────
    // responseMimeType: application/json should give clean JSON, but strip any
    // accidental markdown fences defensively.

    let report: unknown
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      report = JSON.parse(cleaned)
    } catch {
      console.error('[lar] JSON parse failed. First 300 chars:', rawText.slice(0, 300))
      return respond({ error: 'Failed to parse area report — please try again' }, 500)
    }

    console.log(`[lar] Report generated successfully for ${formatted}`)

    return respond({ report })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[lar] Fatal:', msg)
    return respond({ error: msg }, 500)
  }
})
