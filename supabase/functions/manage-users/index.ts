import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Nicht autorisiert");

    // Verify the requesting user via getClaims
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth claims error:", claimsError?.message);
      throw new Error("Nicht autorisiert");
    }
    const callerId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is superadmin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (callerRole?.role !== "superadmin" && callerRole?.role !== "admin") {
      throw new Error("Nur Superadmins und Admins können Benutzer verwalten");
    }

    const isSuperadminCaller = callerRole?.role === "superadmin";

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, display_name, role } = payload;

      // Admins can only assign review roles
      const adminAllowedRoles = ['controlling', 'geschaeftsleitung', 'hr'];
      if (!isSuperadminCaller && !adminAllowedRoles.includes(role)) {
        throw new Error("Admins dürfen nur Controlling, Geschäftsleitung und HR Rollen zuweisen");
      }

      // Create auth user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name },
      });
      if (createError) throw createError;

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userData.user.id, role });
      if (roleError) throw roleError;

      return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;

      // Admins can only assign review roles
      const adminAllowedRoles = ['controlling', 'geschaeftsleitung', 'hr'];
      if (!isSuperadminCaller && !adminAllowedRoles.includes(role)) {
        throw new Error("Admins dürfen nur Controlling, Geschäftsleitung und HR Rollen zuweisen");
      }

      // Prevent removing the last superadmin
      if (role !== "superadmin") {
        const { data: superadmins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "superadmin");
        const isLastSuperadmin = superadmins?.length === 1 && superadmins[0].user_id === user_id;
        if (isLastSuperadmin) throw new Error("Es muss mindestens ein Superadmin existieren");
      }

      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_email") {
      const { user_id, new_email } = payload;
      if (!new_email || !new_email.includes("@")) {
        throw new Error("Ungültige E-Mail-Adresse");
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email: new_email,
        email_confirm: true,
      });
      if (error) throw error;

      // Update profile display if needed
      await supabaseAdmin
        .from("profiles")
        .update({ display_name: new_email })
        .eq("id", user_id)
        .is("display_name", null);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;

      // Prevent deleting self
      if (user_id === caller.id) throw new Error("Sie können sich nicht selbst löschen");

      // Prevent removing the last superadmin
      const { data: superadmins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "superadmin");
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .single();
      if (targetRole?.role === "superadmin" && superadmins?.length === 1) {
        throw new Error("Es muss mindestens ein Superadmin existieren");
      }

      // Delete auth user (cascades to user_roles and profiles)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { user_id, new_password } = payload;
      if (!new_password || new_password.length < 8) {
        throw new Error("Passwort muss mindestens 8 Zeichen lang sein");
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // Get all users with their roles and profiles
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
      const { data: profiles } = await supabaseAdmin.from("profiles").select("*");

      const enriched = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: profiles?.find((p: any) => p.id === u.id)?.display_name || u.email,
        role: roles?.find((r: any) => r.user_id === u.id)?.role || null,
        created_at: u.created_at,
      }));

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unbekannte Aktion");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
