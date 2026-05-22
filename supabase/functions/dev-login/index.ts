import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of developer / admin emails allowed to bootstrap locally
// without going through the central SSO verification.
const DEV_EMAILS = new Set<string>([
  'bilel.chagra@ssmpartner.ch',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, display_name } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email und Passwort erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!DEV_EMAILS.has(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Dev-Login für diese Email nicht erlaubt' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (String(password).length < 8) {
      return new Response(JSON.stringify({ error: 'Passwort zu kurz' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    let userId: string | null = null;
    if (!existing) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { display_name: display_name || normalizedEmail },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: 'User konnte nicht erstellt werden: ' + createErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = created.user?.id || null;
    } else {
      const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        return new Response(JSON.stringify({ error: 'Passwort konnte nicht gesetzt werden: ' + updErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = existing.id;
    }

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: display_name || normalizedEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Dev-Login Fehler: ' + (err?.message || 'unknown') }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
