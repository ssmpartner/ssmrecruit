// Öffentliche Lookup-Function für die Willkommen-Landing-Page.
// Validiert den Token und liefert die Anzeige-Konfiguration + signierte Video-URL.
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

  let body: { token?: string; preview?: boolean }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  let leadName: string | null = 'Vorschau'
  let usedAt: string | null = null
  let action: string | null = null

  if (!body.preview) {
    const token = body.token
    if (!token || typeof token !== 'string' || token.length < 20 || token.length > 100) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400, headers: corsHeaders })
    }
    const { data: tokenRow } = await supabase
      .from('welcome_lead_tokens')
      .select('token, lead_id, used_at, action, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (!tokenRow) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders })
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 410, headers: corsHeaders })
    }
    usedAt = tokenRow.used_at
    action = tokenRow.action
    const { data: lead } = await supabase.from('leads').select('name').eq('id', tokenRow.lead_id).maybeSingle()
    leadName = lead?.name ?? null
  }

  const { data: cfg } = await supabase.from('welcome_wizard_config').select('*').eq('id', true).maybeSingle()


  // Signed URL for video (bucket is private)
  let videoUrl: string | null = null
  if (cfg?.video_url) {
    const path = extractPath(cfg.video_url, 'welcome-assets')
    if (path) {
      const { data: signed } = await supabase.storage.from('welcome-assets').createSignedUrl(path, 60 * 60)
      videoUrl = signed?.signedUrl ?? null
    } else {
      videoUrl = cfg.video_url
    }
  }
  let thumbUrl: string | null = null
  if (cfg?.thumbnail_url) {
    const path = extractPath(cfg.thumbnail_url, 'welcome-assets')
    if (path) {
      const { data: signed } = await supabase.storage.from('welcome-assets').createSignedUrl(path, 60 * 60)
      thumbUrl = signed?.signedUrl ?? null
    } else {
      thumbUrl = cfg.thumbnail_url
    }
  }

  let appointmentsVideoUrl: string | null = null
  if (cfg?.video_url_appointments) {
    const path = extractPath(cfg.video_url_appointments, 'welcome-assets')
    if (path) {
      const { data: signed } = await supabase.storage.from('welcome-assets').createSignedUrl(path, 60 * 60)
      appointmentsVideoUrl = signed?.signedUrl ?? null
    } else {
      appointmentsVideoUrl = cfg.video_url_appointments
    }
  }
  let appointmentsThumbUrl: string | null = null
  if (cfg?.thumbnail_url_appointments) {
    const path = extractPath(cfg.thumbnail_url_appointments, 'welcome-assets')
    if (path) {
      const { data: signed } = await supabase.storage.from('welcome-assets').createSignedUrl(path, 60 * 60)
      appointmentsThumbUrl = signed?.signedUrl ?? null
    } else {
      appointmentsThumbUrl = cfg.thumbnail_url_appointments
    }
  }

  return new Response(JSON.stringify({
    lead_name: leadName,
    used_at: usedAt,
    action: action,

    config: cfg ? {
      page_title: cfg.page_title,
      page_intro: cfg.page_intro,
      button_proceed_label: cfg.button_proceed_label,
      button_reject_label: cfg.button_reject_label,
      proceed_confirmation_text: cfg.proceed_confirmation_text,
      reject_confirmation_text: cfg.reject_confirmation_text,
      video_url: videoUrl,
      thumbnail_url: thumbUrl,
      video_url_appointments: appointmentsVideoUrl,
      thumbnail_url_appointments: appointmentsThumbUrl,
      appointments_video_title: cfg.appointments_video_title,
      appointments_video_intro: cfg.appointments_video_intro,
    } : null,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})


function extractPath(url: string, bucket: string): string | null {
  if (url.startsWith(`${bucket}/`)) return url.substring(bucket.length + 1)
  const idx = url.indexOf(`/${bucket}/`)
  if (idx === -1) return null
  return url.substring(idx + bucket.length + 2)
}
