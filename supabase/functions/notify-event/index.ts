// Generischer Notification-Dispatcher
// Wird von DB-Triggern via dispatch_notification() aufgerufen.
// Verteilt eine Benachrichtigung an alle Mitarbeiter, die laut Rollen-Matrix
// + persönlichen Overrides empfangsberechtigt sind – Glocke + interne E-Mail
// + Aktivitäts-Log.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Payload {
  notification_type: string
  entity_type?: string | null
  entity_id?: string | null
  lead_id?: string | null
  title: string
  description?: string | null
  html?: string | null
  trigger_label?: string | null
  triggered_by_user_id?: string | null
}

interface Recipient {
  user_id: string | null
  email: string
  employee_name: string | null
}

function esc(s: unknown): string {
  if (s === null || s === undefined || s === '') return '–'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml(title: string, description: string, leadId?: string | null): string {
  const link = leadId
    ? `<div style="margin-top:24px;"><a href="https://recruit.ssmpartner.ch/leads?lead=${encodeURIComponent(leadId)}" style="background:#324642;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Im System öffnen</a></div>`
    : ''
  return `
  <div style="font-family:'DM Sans',Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
    <div style="border-left:4px solid #324642;padding:8px 16px;margin-bottom:20px;">
      <h2 style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;color:#324642;">${esc(title)}</h2>
    </div>
    <p style="font-size:14px;line-height:1.6;">${esc(description)}</p>
    ${link}
    <p style="margin-top:32px;color:#999;font-size:12px;">SSM Recruit · automatische Benachrichtigung</p>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!payload.notification_type || !payload.title) {
    return new Response(JSON.stringify({ error: 'notification_type & title required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const type = payload.notification_type
  const description = payload.description ?? ''
  const baseLog = {
    notification_type: type,
    trigger_source: 'system_trigger',
    trigger_label: payload.trigger_label ?? null,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    subject: payload.title,
    triggered_by_user_id: payload.triggered_by_user_id ?? null,
  }

  // 1. In-App Empfänger (Glocke)
  const { data: inAppRows } = await supabase.rpc('get_notification_recipients', {
    _notification_type: type,
    _channel: 'in_app',
    _lead_id: payload.lead_id ?? null,
  })
  const inApp = (inAppRows as Recipient[] | null) ?? []
  if (inApp.length > 0) {
    const notifRows = inApp
      .filter((r) => r.user_id)
      .map((r) => ({
        type,
        title: payload.title,
        description,
        lead_id: payload.lead_id ?? null,
        recipient_user_id: r.user_id,
      }))
    if (notifRows.length > 0) {
      await supabase.from('notifications').insert(notifRows)
    }
    await supabase.from('notification_activity_log').insert(
      inApp.map((r) => ({
        ...baseLog,
        channel: 'in_app',
        recipient_user_id: r.user_id,
        recipient_email: r.email,
        recipient_name: r.employee_name,
        status: 'sent',
      })),
    )
  }

  // 2. E-Mail Empfänger (intern, Mitarbeiter)
  const { data: emailRows } = await supabase.rpc('get_notification_recipients', {
    _notification_type: type,
    _channel: 'email',
    _lead_id: payload.lead_id ?? null,
  })
  const emailRecs = (emailRows as Recipient[] | null) ?? []
  const uniqByEmail = new Map<string, Recipient>()
  emailRecs.forEach((r) => { if (r.email) uniqByEmail.set(r.email, r) })
  const recipients = Array.from(uniqByEmail.keys())

  if (recipients.length > 0) {
    const html = payload.html || buildHtml(payload.title, description, payload.lead_id ?? null)
    const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        to: recipients,
        subject: payload.title,
        html,
        audience: 'internal',
        tags: [{ name: 'type', value: type }],
      }),
    })
    const sendData = await sendResp.json().catch(() => ({}))
    const status = sendResp.ok ? 'sent' : 'failed'
    const error = sendResp.ok ? null : JSON.stringify(sendData).slice(0, 500)
    await supabase.from('notification_activity_log').insert(
      Array.from(uniqByEmail.values()).map((r) => ({
        ...baseLog,
        channel: 'email',
        recipient_user_id: r.user_id,
        recipient_email: r.email,
        recipient_name: r.employee_name,
        status,
        error,
      })),
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      in_app: inApp.length,
      email: recipients.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
