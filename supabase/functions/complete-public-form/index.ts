import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  kind: 'document_request' | 'insights_request';
  token: string;
  // For insights, the responses payload to store
  responses?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: Body = await req.json();
    const { kind, token } = body;

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

    // Verify token exists & not expired/used
    const { data: row, error: lookupErr } = await supabase
      .from(table)
      .select('id, status, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (lookupErr || !row) {
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (kind === 'insights_request') {
      // Defensive cap on responses size
      const responses = body.responses && typeof body.responses === 'object' ? body.responses : {};
      const serialized = JSON.stringify(responses);
      if (serialized.length > 200_000) {
        return new Response(JSON.stringify({ error: 'Responses payload too large' }), {
          status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      updates.responses = responses;
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update(updates)
      .eq('id', row.id);

    if (updateErr) {
      console.error('Update error:', updateErr);
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('complete-public-form error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
