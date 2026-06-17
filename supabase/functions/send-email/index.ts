// Zentrale Email-Sende-Funktion via Resend Connector Gateway
// Aufruf: supabase.functions.invoke('send-email', { body: { to, subject, html, text?, from? } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const DEFAULT_FROM = 'ssmrecruit <noreply@send.ssmpartner.ch>'

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
