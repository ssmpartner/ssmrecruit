// Sendet eine E-Mail-Benachrichtigung, wenn ein neuer Lead angelegt wird.
// Wird per DB-Trigger auf public.leads (AFTER INSERT) aufgerufen.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Empfängerliste wird dynamisch aus employee_notification_prefs (Opt-in) ermittelt.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function esc(s: unknown): string {
  if (s === null || s === undefined || s === '') return '–'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Interne Function: kein User-Auth, da DB-Trigger der einzige Aufrufer ist.
  // Schutz erfolgt über Eingabe-Validierung (lead_id muss existieren).


  let payload: { lead_id?: string; lead?: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const leadId = payload.lead_id
  if (!leadId) {
    return new Response(JSON.stringify({ error: 'lead_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Vollen Lead inkl. Agency + Mitarbeiter laden
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, name, source, canton, status, created_at, agency_id, employee_id')
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) {
    console.error('Lead not found', { leadId, error })
    return new Response(JSON.stringify({ error: 'Lead not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const [{ data: agency }, { data: employee }] = await Promise.all([
    lead.agency_id
      ? supabase.from('agencies').select('name').eq('id', lead.agency_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lead.employee_id
      ? supabase.from('employees').select('name').eq('id', lead.employee_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const appUrl = 'https://recruit.ssmpartner.ch'
  const leadUrl = `${appUrl}/leads?lead=${encodeURIComponent(lead.id)}`

  const html = `
  <div style="font-family:'DM Sans',Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
    <div style="border-left:4px solid #324642;padding:8px 16px;margin-bottom:24px;">
      <h2 style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;color:#324642;">Neuer Lead eingegangen</h2>
      <p style="margin:4px 0 0;color:#666;font-size:14px;">${esc(new Date(lead.created_at as string).toLocaleString('de-CH'))}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#666;width:130px;">Name</td><td style="padding:6px 0;font-weight:600;">${esc(lead.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Kanton</td><td style="padding:6px 0;">${esc(lead.canton)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Quelle</td><td style="padding:6px 0;">${esc(lead.source)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Status</td><td style="padding:6px 0;">${esc(lead.status)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Agentur</td><td style="padding:6px 0;">${esc(agency?.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Zugewiesen</td><td style="padding:6px 0;">${esc(employee?.name)}</td></tr>
    </table>

    <div style="margin-top:28px;">
      <a href="${leadUrl}" style="background:#324642;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Lead öffnen</a>
    </div>

    <p style="margin-top:32px;color:#999;font-size:12px;">SSM Recruit · automatische Benachrichtigung</p>
  </div>
  `



  // Effektive Empfänger ermitteln (Rollen-Default + persönlicher Override)
  // Lead-ID übergeben → RPC schränkt automatisch auf zuständigen Mitarbeiter
  // + Agency-Manager/Backoffice der Agentur + Superadmin/Admin ein.
  const [emailRes, inAppRes] = await Promise.all([
    supabase.rpc('get_notification_recipients', { _notification_type: 'lead_new', _channel: 'email', _lead_id: lead.id }),
    supabase.rpc('get_notification_recipients', { _notification_type: 'lead_new', _channel: 'in_app', _lead_id: lead.id }),
  ])
  const recRows = emailRes.data
  const inAppRecRows = inAppRes.data
  if (emailRes.error) console.error('notify-new-lead: email recipient lookup failed', emailRes.error)
  if (inAppRes.error) console.error('notify-new-lead: in_app recipient lookup failed', inAppRes.error)

  // In-App-Glocke + Log
  type RecipientLite = { user_id: string | null; email: string | null; employee_name: string | null }
  const inAppRecs = ((inAppRecRows as RecipientLite[] | null) ?? [])
  const inAppByUser = new Map<string, RecipientLite>()
  inAppRecs.forEach((r) => { if (r.user_id) inAppByUser.set(r.user_id, r) })
  if (inAppByUser.size > 0) {
    const notifRows = Array.from(inAppByUser.values()).map((r) => ({
      type: 'lead_new',
      title: `Neuer Lead: ${lead.name ?? lead.id}`,
      description: `Quelle: ${lead.source ?? '–'} · Kanton: ${lead.canton ?? '–'}`,
      lead_id: lead.id,
      recipient_user_id: r.user_id,
    }))
    await supabase.from('notifications').insert(notifRows)
    await supabase.from('notification_activity_log').insert(
      Array.from(inAppByUser.values()).map((r) => ({
        notification_type: 'lead_new',
        channel: 'in_app',
        trigger_source: 'system_trigger',
        trigger_label: `lead_new:${lead.source ?? 'manual'}`,
        entity_type: 'lead',
        entity_id: lead.id,
        subject: `Neuer Lead: ${lead.name ?? lead.id}`,
        recipient_user_id: r.user_id,
        recipient_email: r.email,
        recipient_name: r.employee_name,
        status: 'sent',
      })),
    )
  }

  type Recipient = { user_id: string | null; email: string; employee_name: string | null }
  const allRecs = ((recRows as Recipient[] | null) ?? []).filter((r) => r.email)
  const seen = new Set<string>()
  const uniqueRecs = allRecs.filter((r) => {
    if (seen.has(r.email)) return false
    seen.add(r.email)
    return true
  })
  const recipients = uniqueRecs.map((r) => r.email)
  const subject = `Neuer Lead: ${lead.name ?? lead.id}`
  const triggerLabel = `lead_new:${lead.source ?? 'manual'}`

  const logEntry = (extra: Record<string, unknown>) => ({
    notification_type: 'lead_new',
    channel: 'email',
    trigger_source: 'system_trigger',
    trigger_label: triggerLabel,
    entity_type: 'lead',
    entity_id: lead.id,
    subject,
    ...extra,
  })

  if (recipients.length === 0) {
    console.log('notify-new-lead: keine Empfänger – nichts gesendet', { leadId })
    await supabase.from('notification_activity_log').insert([
      logEntry({ status: 'skipped', error: 'no_recipients' }),
    ])
    return new Response(JSON.stringify({ success: true, skipped: 'no_recipients', lead_id: lead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Über zentrale send-email Function senden
  const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      to: recipients,
      subject,
      html,
      audience: 'internal',
      tags: [{ name: 'type', value: 'new-lead-notification' }],
    }),
  })

  const sendData = await sendResp.json().catch(() => ({}))

  // Pro Empfänger einen Log-Eintrag
  const status = sendResp.ok ? 'sent' : 'failed'
  const errText = sendResp.ok ? null : JSON.stringify(sendData).slice(0, 500)
  await supabase.from('notification_activity_log').insert(
    uniqueRecs.map((r) =>
      logEntry({
        recipient_user_id: r.user_id,
        recipient_email: r.email,
        recipient_name: r.employee_name,
        status,
        error: errText,
        metadata: sendResp.ok ? { email_id: sendData?.id ?? null } : null,
      })
    )
  )

  if (!sendResp.ok) {
    console.error('notify-new-lead send failed', { sendData })
    return new Response(JSON.stringify({ error: 'send failed', details: sendData }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, lead_id: lead.id, email_id: sendData?.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
