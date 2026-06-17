// Zentrale Email-Sende-Funktion via Resend Connector Gateway
// Aufruf: supabase.functions.invoke('send-email', { body: { to, subject, html, text?, from?, audience? } })
//
// audience:
//   'internal' (Default) → Mitarbeiter, läuft immer
//   'external'           → Lead/Kandidat/extern → benötigt Master-Schalter
//                          app_settings.email_delivery.external_emails_enabled = true

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const DEFAULT_FROM = 'SSM Recruit <noreply@send.ssmpartner.ch>'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SendEmailBody {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  reply_to?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  tags?: Array<{ name: string; value: string }>
  audience?: 'internal' | 'external'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error('Missing API keys', {
      hasLovable: !!LOVABLE_API_KEY,
      hasResend: !!RESEND_API_KEY,
    })
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let body: SendEmailBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!body.to || !body.subject || (!body.html && !body.text)) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, subject, html|text' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Master-Schalter für externe E-Mails prüfen
  const audience = body.audience ?? 'external'
  if (audience === 'external') {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'email_delivery')
        .maybeSingle()
      const enabled = (setting?.value as { external_emails_enabled?: boolean } | null)?.external_emails_enabled === true
      if (!enabled) {
        console.log('send-email: external_emails_disabled, blocking send', { to: body.to, subject: body.subject })
        return new Response(
          JSON.stringify({ error: 'external_emails_disabled', message: 'Externe E-Mails sind deaktiviert. Superadmin kann sie in den Einstellungen aktivieren.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (err) {
      console.error('send-email: failed to check master switch', err)
      return new Response(
        JSON.stringify({ error: 'config_check_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const payload = {
    from: body.from || DEFAULT_FROM,
    to: Array.isArray(body.to) ? body.to : [body.to],
    subject: body.subject,
    html: body.html,
    text: body.text,
    reply_to: body.reply_to,
    cc: body.cc,
    bcc: body.bcc,
    tags: body.tags,
  }

  try {
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      console.error('Resend send failed', { status: resp.status, data })
      return new Response(
        JSON.stringify({ error: 'Resend send failed', status: resp.status, details: data }),
        { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent', { to: payload.to, id: data?.id })
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('send-email error', { error: msg })
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
