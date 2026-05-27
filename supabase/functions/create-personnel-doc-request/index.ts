import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  personnel_token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { personnel_token } = (await req.json()) as Body;
    if (!personnel_token || typeof personnel_token !== 'string' || personnel_token.length < 10 || personnel_token.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate personnel token
    const { data: pr, error: prErr } = await supabase
      .from('personnel_requests')
      .select('id, lead_id, expires_at, status')
      .eq('token', personnel_token)
      .maybeSingle();

    if (prErr || !pr) {
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pr.expires_at && new Date(pr.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reuse an active pending request if it exists
    const { data: existing } = await supabase
      .from('document_requests')
      .select('id, token, expires_at')
      .eq('lead_id', pr.lead_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        id: existing.id, token: existing.token, lead_id: pr.lead_id,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create a new document_request with 14-day expiry (matches personnel link)
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: created, error: cErr } = await supabase
      .from('document_requests')
      .insert({ lead_id: pr.lead_id, sent_via: 'personnel_wizard', expires_at: expiresAt })
      .select('id, token')
      .single();

    if (cErr || !created) {
      console.error('create-personnel-doc-request insert error:', cErr);
      return new Response(JSON.stringify({ error: 'Could not create request' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      id: created.id, token: created.token, lead_id: pr.lead_id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('create-personnel-doc-request error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
