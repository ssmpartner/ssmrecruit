import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SSO_API_URL = "https://nopqgykpyaieyizvhuma.supabase.co/functions/v1/sso-auth";
const SSO_PROJECT_KEY = "ssm-recruit";

type SsoUser = {
  id?: string;
  email: string;
  display_name?: string;
  avatar_url?: string | null;
  role?: string | null;
  agency_id?: string | null;
  agency_name?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const ssoSecret = Deno.env.get('SSO_API_SECRET') || '';

    // Validate caller is superadmin
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleRow?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Nur Superadmins dürfen synchronisieren' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch users from central SSO
    const ssoRes = await fetch(SSO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sso-api-key': ssoSecret },
      body: JSON.stringify({ action: 'list_project_users', project_key: SSO_PROJECT_KEY }),
    });
    const ssoData = await ssoRes.json();
    console.log('[sync] SSO response status:', ssoRes.status, 'body:', JSON.stringify(ssoData).slice(0, 500));
    if (!ssoRes.ok || ssoData.error) {
      return new Response(JSON.stringify({ error: ssoData.error || 'SSO-Abruf fehlgeschlagen', sso_status: ssoRes.status, sso_body: ssoData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accept multiple shapes: {users:[...]}, {data:{users:[...]}}, or array
    const ssoUsers: SsoUser[] = Array.isArray(ssoData)
      ? ssoData
      : (ssoData.users || ssoData.data?.users || ssoData.project_users || []);
    console.log('[sync] users count:', ssoUsers.length);

    // Fallback agency: Hauptsitz
    const { data: hauptsitz } = await admin
      .from('agencies')
      .select('id')
      .ilike('name', '%hauptsitz%')
      .maybeSingle();
    const fallbackAgencyId = hauptsitz?.id || null;

    // Existing local agencies (to validate ssoUser.agency_id)
    const { data: agencyRows } = await admin.from('agencies').select('id');
    const validAgencyIds = new Set((agencyRows || []).map(a => a.id));

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // List existing auth users once
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const usersByEmail = new Map<string, any>();
    (existingUsers?.users || []).forEach(u => {
      if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
    });

    for (const su of ssoUsers) {
      try {
        if (!su.email) { failed++; continue; }
        const email = su.email.toLowerCase();
        const displayName = su.display_name || email;
        const avatarUrl = su.avatar_url || null;
        const role = (su.role || 'backoffice') as string;

        let agencyId: string | null = su.agency_id || null;
        if (!agencyId || !validAgencyIds.has(agencyId)) {
          agencyId = fallbackAgencyId;
        }
        if (!agencyId) { failed++; errors.push(`${email}: keine Agentur verfügbar`); continue; }

        let authUser = usersByEmail.get(email);
        let userId: string;
        let isNew = false;

        if (!authUser) {
          const tempPassword = crypto.randomUUID() + '-Ax1!';
          const { data: createdRes, error: createErr } = await admin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { display_name: displayName, avatar_url: avatarUrl },
          });
          if (createErr || !createdRes.user) {
            failed++; errors.push(`${email}: ${createErr?.message || 'Auth-Create fehlgeschlagen'}`);
            continue;
          }
          userId = createdRes.user.id;
          isNew = true;
        } else {
          userId = authUser.id;
          await admin.auth.admin.updateUserById(userId, {
            user_metadata: { ...(authUser.user_metadata || {}), display_name: displayName, avatar_url: avatarUrl },
          });
        }

        // Profile upsert
        await admin.from('profiles').upsert({
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Role upsert (map unknown roles to backoffice)
        const validRoles = ['superadmin','admin','backoffice','analyst','teamleiter','controlling','geschaeftsleitung','hr','agency_manager'];
        const finalRole = validRoles.includes(role) ? role : 'backoffice';
        await admin.from('user_roles').upsert(
          { user_id: userId, role: finalRole as any },
          { onConflict: 'user_id,role' }
        );

        // Employee upsert by email
        const { data: existingEmp } = await admin
          .from('employees')
          .select('id')
          .ilike('email', email)
          .maybeSingle();

        if (existingEmp) {
          await admin.from('employees').update({
            name: displayName,
            email,
            avatar: avatarUrl,
            user_id: userId,
            agency_id: agencyId,
            role: finalRole,
            updated_at: new Date().toISOString(),
          }).eq('id', existingEmp.id);
          updated++;
        } else {
          const empId = `emp-${crypto.randomUUID().slice(0, 8)}`;
          await admin.from('employees').insert({
            id: empId,
            name: displayName,
            email,
            avatar: avatarUrl,
            user_id: userId,
            agency_id: agencyId,
            role: finalRole,
          });
          created++;
        }

        if (isNew && !created) created++;
      } catch (e: any) {
        failed++;
        errors.push(`${su.email}: ${e?.message || 'Unbekannter Fehler'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: ssoUsers.length,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Sync fehlgeschlagen' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
