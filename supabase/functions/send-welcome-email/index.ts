// Sendet die Willkommen-E-Mail an einen Lead. Wird per DB-Trigger (auto=true)
// oder manuell aus dem UI (auto=false) aufgerufen.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://recruit.ssmpartner.ch'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  let payload: { lead_id?: string; auto?: boolean }
  try { payload = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }
  const leadId = payload.lead_id
  const auto = payload.auto !== false
  if (!leadId) {
    return new Response(JSON.stringify({ error: 'lead_id required' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const [{ data: lead }, { data: cfg }] = await Promise.all([
    supabase.from('leads').select('id, name, email, source').eq('id', leadId).maybeSingle(),
    supabase.from('welcome_wizard_config').select('*').eq('id', true).maybeSingle(),
  ])

  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: corsHeaders })
  if (!cfg) return new Response(JSON.stringify({ error: 'Config missing' }), { status: 500, headers: corsHeaders })

  if (!lead.email) {
    return new Response(JSON.stringify({ skipped: 'no_email' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (auto) {
    if (!cfg.enabled) {
      return new Response(JSON.stringify({ skipped: 'disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const sources: string[] = cfg.auto_sources ?? []
    if (sources.length === 0 || !lead.source || !sources.includes(lead.source)) {
      return new Response(JSON.stringify({ skipped: 'source_not_enabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // Invalidate previous unused tokens
  await supabase.from('welcome_lead_tokens')
    .update({ used_at: new Date().toISOString(), action: null })
    .eq('lead_id', leadId).is('used_at', null)

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('welcome_lead_tokens')
    .insert({ lead_id: leadId })
    .select('token')
    .single()

  if (tokenErr || !tokenRow) {
    console.error('send-welcome-email: token insert failed', tokenErr)
    return new Response(JSON.stringify({ error: 'token_insert_failed' }), { status: 500, headers: corsHeaders })
  }

  const ctaUrl = `${APP_URL}/willkommen?token=${tokenRow.token}`
  const name = lead.name ?? 'Kandidat:in'

  const html = (cfg.email_html as string)
    .replaceAll('{{name}}', escapeHtml(name))
    .replaceAll('{{cta_url}}', ctaUrl)
    .replaceAll('{{video_thumbnail}}', cfg.thumbnail_url ?? '')
  const subject = (cfg.email_subject as string).replaceAll('{{name}}', name)

  const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      to: [lead.email],
      subject,
      html,
      audience: 'external',
      tags: [{ name: 'type', value: 'welcome_wizard' }],
    }),
  })

  const sendData = await sendResp.json().catch(() => ({}))
  const status = sendResp.ok ? 'sent' : 'failed'

  await supabase.from('notification_activity_log').insert({
    notification_type: 'welcome_email',
    channel: 'email',
    trigger_source: auto ? 'system_trigger' : 'manual',
    trigger_label: `welcome_email:${auto ? 'auto' : 'manual'}`,
    entity_type: 'lead',
    entity_id: leadId,
    subject,
    recipient_email: lead.email,
    recipient_name: lead.name,
    status,
    error: sendResp.ok ? null : JSON.stringify(sendData).slice(0, 500),
  })

  if (!sendResp.ok) {
    return new Response(JSON.stringify({ error: 'send_failed', details: sendData }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ success: true, token: tokenRow.token, cta_url: ctaUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
