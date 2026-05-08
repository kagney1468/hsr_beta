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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
    const resendKey   = Deno.env.get('RESEND_API_KEY')!
    const siteUrl     = (Deno.env.get('SITE_URL') ?? 'https://homesalesready.com').replace(/\/$/, '')

    if (!resendKey) return respond({ error: 'RESEND_API_KEY not configured' }, 500)

    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Unauthorised' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return respond({ error: 'Unauthorised' }, 401)

    // ── Payload ───────────────────────────────────────────────────────────────
    const { property_id, agent_name, agent_email, agent_company } = await req.json()
    if (!property_id || !agent_name || !agent_email) {
      return respond({ error: 'property_id, agent_name and agent_email are required' }, 400)
    }

    const db = createClient(supabaseUrl, serviceKey)

    // ── Verify property belongs to this seller ────────────────────────────────
    const { data: prop } = await db
      .from('properties')
      .select('id, address_postcode, pack_reference')
      .eq('id', property_id)
      .eq('seller_user_id', user.id)
      .maybeSingle()

    if (!prop) return respond({ error: 'Property not found or access denied' }, 403)

    // ── Generate token and insert LPE1 record ─────────────────────────────────
    const crypto = globalThis.crypto
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Upsert — if a record already exists for this property, replace it
    const { error: upsertErr } = await db
      .from('property_lpe1')
      .upsert(
        {
          property_id,
          status: 'requested',
          request_token: token,
          requested_at: new Date().toISOString(),
          requested_by_user_id: user.id,
          completed_by_name: agent_name,
          completed_by_company: agent_company ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id' }
      )

    if (upsertErr) {
      console.error('[send-lpe1-request] upsert error:', upsertErr.message)
      return respond({ error: 'Could not create LPE1 record: ' + upsertErr.message }, 500)
    }

    // ── Build tokenised link ──────────────────────────────────────────────────
    const lpe1Link = `${siteUrl}/lpe1/${token}`
    const propertyRef = prop.pack_reference ?? prop.address_postcode ?? 'your property'

    // ── Email HTML ────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{background:#ffffff;color:#1a2e2f;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;padding:40px 20px}
.header{text-align:center;margin-bottom:40px}
.logo{max-height:40px;margin-bottom:20px}
.card{background:#ffffff;border:1.5px solid #ddeaeb;border-radius:20px;padding:40px}
.heading{font-size:24px;font-weight:800;margin-bottom:16px;color:#0d4a4a}
.text{color:#5a7a7c;font-size:16px;line-height:1.6;margin-bottom:24px}
.highlight{background:#f0fafa;border:1.5px solid #ddeaeb;border-radius:12px;padding:16px 20px;margin-bottom:28px;font-size:14px;color:#0d4a4a}
.button{display:inline-block;background-color:#17afaf;color:#ffffff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.05em}
.footer{text-align:center;margin-top:40px;color:#5a7a7c;font-size:12px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="https://vjpkwwhqbvivaxdnydbx.supabase.co/storage/v1/object/public/brand/hsr-logo-white.png" alt="HomeSalesReady" class="logo">
  </div>
  <div class="card">
    <h1 class="heading">LPE1 Information Request</h1>
    <p class="text">Hello ${agent_name},</p>
    <p class="text">You have been asked to complete a Leasehold Property Enquiries (LPE1) form for the following property:</p>
    <div class="highlight">
      <strong>Property reference:</strong> ${propertyRef}
    </div>
    <p class="text">No account is needed. Click the button below to open a secure form and complete the LPE1 at your convenience. The link is unique to this request.</p>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${lpe1Link}" class="button">Complete LPE1 Form</a>
    </div>
    <p style="color:#5a7a7c;font-size:13px;margin:0">If you did not expect this request, you can safely ignore this email. The link will expire once the form is submitted.</p>
  </div>
  <div class="footer">&copy; 2026 HomeSalesReady. All rights reserved.<br>HomeSalesReady UK — Digital property packs for faster sales.</div>
</div>
</body>
</html>`

    // ── Send via Resend ───────────────────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HomeSalesReady <noreply@homesalesready.com>',
        to: [agent_email],
        subject: `LPE1 information request — ${propertyRef}`,
        html,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error('[send-lpe1-request] Resend error:', JSON.stringify(resendData))
      return respond({ error: 'Email could not be sent: ' + (resendData?.message || 'unknown error') }, 500)
    }

    console.log(`[send-lpe1-request] Email sent to ${agent_email}, id=${resendData?.id}`)
    return respond({ success: true, email_id: resendData?.id })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-lpe1-request] Fatal:', msg)
    return respond({ error: msg }, 500)
  }
})
