import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SSO_API_URL = "https://nopqgykpyaieyizvhuma.supabase.co/functions/v1/sso-auth";
const SSO_PROJECT_KEY = "ssm-recruit";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email und Passwort erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ssoSecret = Deno.env.get('SSO_API_SECRET') || '';

    // 1. Verify via central SSO
    const ssoRes = await fetch(SSO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-api-key': ssoSecret,
      },
      body: JSON.stringify({
        action: 'verify',
        email,
        password,
        project_key: SSO_PROJECT_KEY,
      }),
    });

    const ssoData = await ssoRes.json();

    if (!ssoRes.ok || ssoData.error) {
      return new Response(JSON.stringify({ error: ssoData.error || 'SSO-Verifizierung fehlgeschlagen' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Ensure user exists locally (using service role for admin access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    const ssoUser = ssoData.user || {};
    const displayName = ssoUser.display_name || ssoUser.name || email;
    const avatarUrl = ssoUser.avatar_url || ssoUser.avatar || ssoUser.photo_url || ssoUser.profile_photo || '';

    let localUserId: string | null = null;

    if (!existingUser) {
      // Create user with confirmed email so they can sign in immediately
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, avatar_url: avatarUrl },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: 'Lokaler Benutzer konnte nicht erstellt werden: ' + createError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      localUserId = created.user?.id || null;
    } else {
      // Update password + metadata to match SSO
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: { ...(existingUser.user_metadata || {}), display_name: displayName, avatar_url: avatarUrl },
      });
      localUserId = existingUser.id;
    }

    // Sync profile row (display_name + avatar_url)
    if (localUserId) {
      await supabase.from('profiles').upsert({
        id: localUserId,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ success: true, user: ssoData.user }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'SSO-Proxy Fehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
