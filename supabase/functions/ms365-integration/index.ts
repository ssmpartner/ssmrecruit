// Microsoft 365 (Entra ID / Graph) Integration – Status, Test, Verbindungen
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = (body.action as string) || new URL(req.url).searchParams.get('action') || 'status';

    const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID') || '';
    const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET') || '';
    const envTenant = Deno.env.get('MS_GRAPH_TENANT_ID') || '';

    const missing: string[] = [];
    if (!clientId) missing.push('MS_GRAPH_CLIENT_ID');
    if (!clientSecret) missing.push('MS_GRAPH_CLIENT_SECRET');

    if (action === 'status') {
      const { count } = await admin
        .from('microsoft_calendar_connections')
        .select('id', { count: 'exact', head: true })
        .eq('active', true);

      const { data: mine } = await admin
        .from('microsoft_calendar_connections')
        .select('email, tenant_id, connected_at, last_sync_at, active, scopes')
        .eq('user_id', user.id)
        .maybeSingle();

      return json({
        configured: missing.length === 0,
        missing,
        clientPreview: clientId ? `${clientId.slice(0, 8)}…${clientId.slice(-4)}` : null,
        tenantId: envTenant || mine?.tenant_id || null,
        activeConnections: count ?? 0,
        myConnection: mine ?? null,
      });
    }

    if (action === 'test') {
      if (missing.length) return json({ error: 'not_configured', missing }, 412);
      const tenant = (body.tenantId as string) || envTenant || 'common';
      const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: 'https://graph.microsoft.com/.default',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return json({ ok: false, status: res.status, error: data.error_description || data.error || 'token_error' }, 502);
      }
      return json({ ok: true, tenant, expiresIn: data.expires_in ?? null });
    }

    if (action === 'disconnect') {
      await admin.from('microsoft_calendar_connections')
        .update({ active: false })
        .eq('user_id', user.id);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    return json({ error: 'internal_error', message: String(err) }, 500);
  }
});
