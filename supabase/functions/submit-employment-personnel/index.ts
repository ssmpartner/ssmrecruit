import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  document_token: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { document_token, data } = (await req.json()) as Body;
    if (!document_token || typeof document_token !== 'string' || document_token.length < 10 || document_token.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: dr, error: drErr } = await supabase
      .from('document_requests')
      .select('id, lead_id, expires_at, kind')
      .eq('token', document_token)
      .maybeSingle();

    if (drErr || !dr) {
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (dr.expires_at && new Date(dr.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (dr.kind !== 'employment') {
      return new Response(JSON.stringify({ error: 'Wrong link type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current version
    const { data: cur } = await supabase
      .from('lead_personal_data')
      .select('version')
      .eq('lead_id', dr.lead_id)
      .maybeSingle();
    const nextVersion = ((cur as { version?: number } | null)?.version ?? 0) + 1;
    const nowIso = new Date().toISOString();

    const upsertPayload = {
      lead_id: dr.lead_id,
      data,
      version: nextVersion,
      updated_at: nowIso,
      updated_by: 'Kandidat',
      updated_via: 'public',
    };

    const { error: upErr } = await supabase
      .from('lead_personal_data')
      .upsert(upsertPayload, { onConflict: 'lead_id' });
    if (upErr) {
      console.error('upsert lead_personal_data error:', upErr);
      return new Response(JSON.stringify({ error: 'Could not save' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('lead_personal_data_versions').insert([{
      lead_id: dr.lead_id,
      version: nextVersion,
      data,
      updated_at: nowIso,
      updated_by: 'Kandidat',
      updated_via: 'public',
    }]);

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: dr.lead_id,
      type: 'edit',
      description: `Personalstammdaten vom Kandidaten ausgefüllt (Version ${nextVersion})`,
      user: 'Kandidat',
    });

    return new Response(JSON.stringify({ ok: true, version: nextVersion }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('submit-employment-personnel error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
