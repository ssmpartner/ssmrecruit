import { corsHeaders } from '@supabase/supabase-js/cors'

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

    return new Response(JSON.stringify(ssoData), {
      status: ssoRes.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'SSO-Proxy Fehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
