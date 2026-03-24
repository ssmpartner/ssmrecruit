import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function resolveAgencyByLocation(supabase: any, plz: string, city: string) {
  // Try to resolve canton from PLZ using the DB function
  if (!plz && !city) return null;

  // Use the resolve_agency_by_canton DB function if we can determine canton
  // First, try to find canton from existing leads with same PLZ
  if (plz) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('canton_code, agency_id')
      .eq('plz', plz)
      .not('canton_code', 'eq', '')
      .limit(1)
      .single();

    if (existingLead?.canton_code) {
      const { data: agencyId } = await supabase.rpc('resolve_agency_by_canton', { _canton_code: existingLead.canton_code });
      if (agencyId) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('agency_id', agencyId)
          .limit(1)
          .single();
        return { agencyId, employeeId: employee?.id };
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    console.log('Form webhook payload:', JSON.stringify(body));

    // Validate required fields
    const name = (body.name || body.vorname || body.full_name || body.fullName || '').trim();
    const email = (body.email || body.e_mail || '').trim();
    const phone = (body.phone || body.telefon || body.phone_number || '').trim();
    const city = (body.city || body.stadt || body.ort || '').trim();
    const plz = (body.plz || body.zip || body.postleitzahl || '').trim();
    const address = (body.address || body.adresse || body.strasse || '').trim();
    const notes = (body.notes || body.nachricht || body.message || body.bemerkung || '').trim();
    const campaign = (body.campaign || body.kampagne || body.source_detail || '').trim();
    const formSource = (body.form_source || body.form_name || 'website').trim();

    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: 'Name ist erforderlich (min. 2 Zeichen)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Gültige E-Mail-Adresse erforderlich' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try PLZ-based agency resolution first
    const locationMatch = await resolveAgencyByLocation(supabase, plz, city);

    let agencyId = locationMatch?.agencyId;
    let employeeId = locationMatch?.employeeId;

    // Fallback to Hauptsitz
    if (!agencyId) {
      const { data: hauptsitz } = await supabase
        .from('agencies')
        .select('id')
        .ilike('name', '%hauptsitz%')
        .limit(1)
        .single();
      agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
    }

    if (!agencyId) {
      throw new Error('Keine Agentur für Lead-Zuweisung gefunden');
    }

    // Fallback employee from resolved agency
    if (!employeeId) {
      const { data: defaultEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('agency_id', agencyId)
        .limit(1)
        .single();
      employeeId = defaultEmployee?.id || (await supabase.from('employees').select('id').limit(1).single()).data?.id;
    }

    if (!employeeId) {
      throw new Error('Kein Mitarbeiter für Lead-Zuweisung gefunden');
    }

    // Check for duplicate by email
    const { data: existing } = await supabase
      .from('leads')
      .select('id, name')
      .eq('email', email)
      .limit(1)
      .single();

    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        duplicate: true,
        message: `Lead mit E-Mail ${email} existiert bereits (${existing.name})`,
        lead_id: existing.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabase.from('leads').insert({
      id,
      name,
      email,
      phone,
      city,
      plz,
      address,
      source: 'website',
      status: 'new',
      campaign,
      agency_id: agencyId,
      employee_id: employeeId,
      notes: notes ? `Website-Formular (${formSource}): ${notes}` : `Automatisch importiert via Website-Formular (${formSource})`,
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) {
      console.error('Error inserting form lead:', error);
      throw new Error(`Lead konnte nicht gespeichert werden: ${error.message}`);
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: id,
      type: 'status_change',
      description: `Lead automatisch via Website-Formular (${formSource}) importiert`,
      user: 'System',
      created_at: now,
    });

    await supabase.from('notifications').insert({
      title: 'Neuer Website-Lead',
      type: 'new_lead',
      description: `${name} wurde via Website-Formular importiert.`,
      lead_id: id,
    });

    return new Response(JSON.stringify({
      success: true,
      lead_id: id,
      message: `Lead ${name} erfolgreich erstellt`,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Form webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
