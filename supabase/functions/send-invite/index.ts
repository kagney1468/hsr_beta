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
    const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://homesalesready.com').replace(/\/$/, '')

    if (!resendKey) return respond({ error: 'RESEND_API_KEY not configured' }, 500)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Unauthorised' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return respond({ error: 'Unauthorised' }, 401)

    const { seller_name, seller_email, agent_ref } = await req.json()
    if (!seller_name || !seller_email || !agent_ref) {
      return respond({ error: 'seller_name, seller_email and agent_ref are required' }, 400)
    }

    const db = createClient(supabaseUrl, serviceKey)

    const { data: agencyRow } = await db
      .from('agencies')
      .select('agency_name, logo_url')
      .eq('agent_user_id', agent_ref)
      .maybeSingle()

    const agencyName = agencyRow?.agency_name || 'HomeSalesReady'
    const logoUrl    = agencyRow?.logo_url    || 'https://vjpkwwhqbvivaxdnydbx.supabase.co/storage/v1/object/public/brand/hsr-logo-white.png'

    const redirectTo = `${siteUrl}/auth/callback?agent_ref=${agent_ref}`

    const { data: otpData, error: otpErr } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: seller_email,
      options: {
        redirectTo,
        data: {
          full_name: seller_name.trim(),
          role: 'seller',
        },
      },
    })

    if (otpErr) {
      console.error('[send-invite] generateLink error:', otpErr.message)
      return respond({ error: 'Could not generate invite link: ' + otpErr.message }, 500)
    }

    const inviteLink = otpData?.properties?.action_link
    if (!inviteLink) return respond({ error: 'No invite link generated' }, 500)

    console.log(`[send-invite] Link generated for ${seller_email}`)

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{background:#ffffff;color:#1a2e2f;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;padding:40px 20px}
.header{text-align:center;margin-bottom:40px}
.logo{max-height:40px;margin-bottom:20px}
.card{background:#ffffff;border:1.5px solid #ddeaeb;border-radius:20px;padding:40px;text-align:center}
.heading{font-size:24px;font-weight:800;margin-bottom:16px;color:#0d4a4a}
.text{color:#5a7a7c;font-size:16px;line-height:1.6;margin-bottom:32px}
.button{display:inline-block;background-color:#17afaf;color:#ffffff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.05em}
.footer{text-align:center;margin-top:40px;color:#5a7a7c;font-size:12px}
</style>
</head>
<body>
<div class="container">
  <div class="header"><img src="${logoUrl}" alt="${agencyName}" class="logo"></div>
  <div class="card">
    <h1 class="heading">Hello ${seller_name.trim()}!</h1>
    <p class="text"><strong>${agencyName}</strong> has invited you to create a verified property pack on HomeSalesReady.</p>
    <p class="text">Having a verified pack ready upfront makes your home more attractive to buyers and speeds up the sale process.</p>
    <a href="${inviteLink}" class="button">Accept Invitation</a>
    <p style="margin-top:24px;color:#5a7a7c;font-size:12px">This link expires in 24 hours. If you did not expect this email, you can safely ignore it.</p>
  </div>
  <div class="footer">&copy; 2026 ${agencyName}. All rights reserved.<br>Powered by HomeSalesReady UK.</div>
</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HomeSalesReady <noreply@homesalesready.com>',
        to: [seller_email],
        subject: `You have been invited by ${agencyName}`,
        html,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error('[send-invite] Resend error:', JSON.stringify(resendData))
      return respond({ error: 'Email could not be sent: ' + (resendData?.message || 'unknown error') }, 500)
    }

    console.log(`[send-invite] Email sent to ${seller_email}, id=${resendData?.id}`)
    return respond({ success: true, email_id: resendData?.id })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-invite] Fatal:', msg)
    return respond({ error: msg }, 500)
  }
})
