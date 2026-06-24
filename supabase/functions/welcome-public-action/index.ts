// Öffentliche Aktion: Kandidat klickt "Ablehnen" oder "Nächste Schritte".
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  let body: { token?: string; action?: 'reject' | 'proceed' }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders })
  }
  const { token, action } = body
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 100) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400, headers: corsHeaders })
  }
  if (action !== 'reject' && action !== 'proceed') {
    return new Response(JSON.stringify({ error: 'invalid_action' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: tokenRow } = await supabase
    .from('welcome_lead_tokens')
    .select('token, lead_id, used_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders })
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: 'expired' }), { status: 410, headers: corsHeaders })
  }
  if (tokenRow.used_at) {
    return new Response(JSON.stringify({ error: 'already_used' }), { status: 409, headers: corsHeaders })
  }

  let insightsToken: string | null = null

  if (action === 'reject') {
    await supabase.from('leads').update({
      status: 'not_interested',
      lead_lifecycle: 'archived',
    }).eq('id', tokenRow.lead_id)

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: tokenRow.lead_id,
      type: 'note',
      description: 'Kandidat hat über die Willkommen-Seite abgelehnt – Status auf "Nicht interessiert" gesetzt und archiviert.',
      user: 'Willkommen-Wizard',
    })
  } else {
    // proceed → create insights_request token
    const { data: insReq } = await supabase
      .from('insights_requests')
      .insert({ lead_id: tokenRow.lead_id, sent_via: 'welcome_wizard' })
      .select('id, token')
      .single()
    insightsToken = (insReq as any)?.token ?? null

    await supabase.from('welcome_lead_tokens').update({
      insights_request_id: (insReq as any)?.id ?? null,
    }).eq('token', token)

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: tokenRow.lead_id,
      type: 'note',
      description: 'Kandidat hat über die Willkommen-Seite "Nächste Schritte" gewählt – Insights-Test gestartet.',
      user: 'Willkommen-Wizard',
    })
  }

  await supabase.from('welcome_lead_tokens').update({
    used_at: new Date().toISOString(),
    action,
  }).eq('token', token)

  return new Response(JSON.stringify({ success: true, action, insights_token: insightsToken }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
