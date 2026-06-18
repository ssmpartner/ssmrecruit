// Microsoft Graph getSchedule – Verfügbarkeitsabfrage (Phase 1)
// Liest free/busy für angegebene Mitarbeiter-E-Mails im Zeitraum.
// Speichert KEINE Betreff/Inhalt/Teilnehmer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = 'https://graph.microsoft.com/v1.0';

interface ReqBody {
  schedules: string[];   // Liste E-Mails der Interviewer
  startISO: string;      // ISO mit TZ (Europe/Zurich)
  endISO: string;
  intervalMinutes?: number; // default 30
}

async function refreshAccessToken(
  refreshToken: string,
  tenantId: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID');
  const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'Calendars.ReadBasic User.Read offline_access',
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return null;
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body.schedules?.length || !body.startISO || !body.endISO) {
      return new Response(JSON.stringify({ error: 'schedules, startISO, endISO erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-Client für Connection-Lookup
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: conn } = await admin
      .from('microsoft_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (!conn) {
      return new Response(JSON.stringify({
        error: 'no_ms_connection',
        message: 'Keine Microsoft-Kalenderverbindung. Bitte über SSM-Portal mit Microsoft anmelden.',
      }), { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let accessToken = conn.access_token as string;
    const expires = new Date(conn.token_expires_at as string).getTime();
    if (expires - Date.now() < 60_000 && conn.refresh_token) {
      const refreshed = await refreshAccessToken(conn.refresh_token as string, conn.tenant_id as string);
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token;
        await admin.from('microsoft_calendar_connections').update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? conn.refresh_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          last_sync_at: new Date().toISOString(),
        }).eq('id', conn.id);
      }
    }

    const graphBody = {
      schedules: body.schedules,
      startTime: { dateTime: body.startISO, timeZone: 'Europe/Zurich' },
      endTime:   { dateTime: body.endISO,   timeZone: 'Europe/Zurich' },
      availabilityViewInterval: body.intervalMinutes ?? 30,
    };

    const graphRes = await fetch(`${GRAPH}/me/calendar/getSchedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(graphBody),
    });

    if (!graphRes.ok) {
      const text = await graphRes.text();
      return new Response(JSON.stringify({ error: 'graph_error', status: graphRes.status, detail: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const graphData = await graphRes.json();
    // graphData.value[*] -> { scheduleId, availabilityView, scheduleItems[{status,start,end}] }
    // scheduleItems Status: free|tentative|busy|oof|workingElsewhere|unknown
    // Wir entfernen alle weiteren Felder, falls vorhanden (subject, location).
    const cleaned = (graphData.value ?? []).map((row: any) => ({
      scheduleId: row.scheduleId,
      availabilityView: row.availabilityView,
      scheduleItems: (row.scheduleItems ?? []).map((it: any) => ({
        status: it.status,
        start: it.start,
        end: it.end,
      })),
    }));

    await admin.from('microsoft_calendar_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', conn.id);

    return new Response(JSON.stringify({ schedules: cleaned }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
