import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SSO_API_URL = "https://nopqgykpyaieyizvhuma.supabase.co/functions/v1/sso-auth";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, project_key } = await req.json();

    if (!token || !project_key) {
      return new Response(JSON.stringify({ error: 'Token und Project Key erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ssoSecret = Deno.env.get('SSO_API_SECRET') || '';

    // Validate token against central SSM Partner SSO API
    const ssoRes = await fetch(SSO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-api-key': ssoSecret,
      },
      body: JSON.stringify({
        action: 'validate_token',
        token,
        project_key,
      }),
    });

    const ssoData = await ssoRes.json();

    if (!ssoRes.ok || ssoData.error) {
      return new Response(JSON.stringify({ error: ssoData.error || 'Token-Validierung fehlgeschlagen' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ssoUser = ssoData.user;
    if (!ssoUser?.email) {
      return new Response(JSON.stringify({ error: 'Keine Benutzerdaten vom SSO erhalten' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure user exists locally using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === ssoUser.email);

    let userId: string;
    // Generate a secure random password for SSO-provisioned users
    const randomPassword = crypto.randomUUID() + '-Ax1!';

    if (!existingUser) {
      // Create user with confirmed email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ssoUser.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          display_name: ssoUser.display_name || ssoUser.email,
          avatar_url: ssoUser.avatar_url || null,
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: 'Benutzer konnte nicht erstellt werden: ' + createError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = newUser.user.id;
    } else {
      // Update password so we can sign them in
      await supabase.auth.admin.updateUserById(existingUser.id, { password: randomPassword });
      userId = existingUser.id;
    }

    // Generate a session by signing in with the temporary password
    // We use the anon key client for this to get a proper session
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const anonClient = createClient(supabaseUrl, anonKey);
    
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: ssoUser.email,
      password: randomPassword,
    });

    if (signInError || !signInData.session) {
      return new Response(JSON.stringify({ error: 'Session konnte nicht erstellt werden' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        token_type: signInData.session.token_type,
      },
      user: {
        id: userId,
        email: ssoUser.email,
        display_name: ssoUser.display_name || ssoUser.email,
        avatar_url: ssoUser.avatar_url || null,
        role: ssoUser.role || null,
      },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'SSO-Validierung fehlgeschlagen' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
