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



  // Opt-in-Empfänger ermitteln
  const { data: prefs } = await supabase
    .from('employee_notification_prefs')
    .select('user_id')
    .eq('notify_new_lead_email', true)

  const userIds = (prefs ?? []).map((p) => p.user_id).filter(Boolean)
  let recipients: string[] = []
  if (userIds.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('email')
      .in('user_id', userIds)
    recipients = Array.from(new Set((emps ?? []).map((e) => e.email).filter(Boolean)))
  }

  if (recipients.length === 0) {
    console.log('notify-new-lead: keine Opt-in-Empfänger – nichts gesendet', { leadId })
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
      subject: `Neuer Lead: ${lead.name ?? lead.id}`,
      html,
      tags: [{ name: 'type', value: 'new-lead-notification' }],
    }),
  })

  const sendData = await sendResp.json().catch(() => ({}))

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
