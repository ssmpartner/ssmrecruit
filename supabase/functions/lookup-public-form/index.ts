import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  kind: 'document_request' | 'insights_request';
  token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { kind, token } = (await req.json()) as Body;

    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (kind !== 'document_request' && kind !== 'insights_request') {
      return new Response(JSON.stringify({ error: 'Invalid kind' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const table = kind === 'document_request' ? 'document_requests' : 'insights_requests';

    const selectCols = kind === 'document_request'
      ? 'id, lead_id, status, expires_at, sent_at'
      : 'id, lead_id, status, sent_at';

    const { data: row, error } = await supabase
      .from(table)
      .select(selectCols)
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('lookup-public-form db error:', error);
    }

    if (error || !row) {
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let leadName: string | null = null;
    if (row.lead_id) {
      const { data: lead } = await supabase
        .from('leads').select('name').eq('id', row.lead_id).maybeSingle();
      leadName = lead?.name ?? null;
    }

    return new Response(JSON.stringify({
      id: row.id,
      lead_id: row.lead_id,
      status: row.status,
      expires_at: (row as any).expires_at ?? null,
      sent_at: (row as any).sent_at ?? null,
      lead_name: leadName,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('lookup-public-form error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
