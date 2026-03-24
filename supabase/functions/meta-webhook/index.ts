import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function resolveAgencyByPlz(supabase: any, plz: string) {
  if (!plz) return null;
  const { data: existingLead } = await supabase
    .from('leads')
    .select('canton_code')
    .eq('plz', plz)
    .not('canton_code', 'eq', '')
    .limit(1)
    .single();
  if (existingLead?.canton_code) {
    const { data: agencyId } = await supabase.rpc('resolve_agency_by_canton', { _canton_code: existingLead.canton_code });
    if (agencyId) {
      const { data: employee } = await supabase.from('employees').select('id').eq('agency_id', agencyId).limit(1).single();
      return { agencyId, employeeId: employee?.id };
    }
  }
  return null;
}

async function getDefaultAssignment(supabase: any) {
  const { data: hauptsitz } = await supabase.from('agencies').select('id').ilike('name', '%hauptsitz%').limit(1).single();
  const agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
  if (!agencyId) throw new Error('No agency found for lead assignment');
  const { data: emp } = await supabase.from('employees').select('id').eq('agency_id', agencyId).limit(1).single();
  const employeeId = emp?.id || (await supabase.from('employees').select('id').limit(1).single()).data?.id;
  if (!employeeId) throw new Error('No employee found for lead assignment');
  return { agencyId, employeeId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Facebook webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const storedToken = Deno.env.get('META_VERIFY_TOKEN');

      if (mode === 'subscribe' && token && storedToken && token === storedToken && challenge) {
        console.log('Meta webhook verified');
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      return new Response('Verification failed', { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    console.log('Meta webhook payload:', JSON.stringify(body));

    const defaults = await getDefaultAssignment(supabase);
    const inserted = [];

    async function insertLead(name: string, email: string, phone: string, city: string, plz: string, campaign: string) {
      // Try PLZ-based resolution
      const locationMatch = plz ? await resolveAgencyByPlz(supabase, plz) : null;
      const agencyId = locationMatch?.agencyId || defaults.agencyId;
      const employeeId = locationMatch?.employeeId || defaults.employeeId;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data, error } = await supabase.from('leads').insert({
        id, name, email, phone, city, plz,
        source: 'meta', status: 'new', campaign,
        agency_id: agencyId, employee_id: employeeId,
        notes: `Automatisch importiert via Meta Lead Ads`,
        created_at: now, updated_at: now,
      }).select().single();

      if (error) {
        console.error('Error inserting Meta lead:', error);
        return;
      }
      inserted.push(data);
      await supabase.from('activities').insert({ id: crypto.randomUUID(), lead_id: id, type: 'status_change', description: 'Lead automatisch via Meta Lead Ads importiert', user: 'System', created_at: now });
      await supabase.from('notifications').insert({ title: 'Neuer Meta Lead', type: 'new_lead', description: `${name} wurde via Meta Lead Ads importiert.`, lead_id: id });
    }

    if (body.object === 'page' && body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.field !== 'leadgen') continue;
          const leadData = change.value;
          const fieldData = leadData.field_data || [];
          const mapped: Record<string, string> = {};
          for (const field of fieldData) {
            mapped[(field.name || '').toLowerCase()] = Array.isArray(field.values) ? field.values[0] : field.value || '';
          }
          await insertLead(
            mapped.full_name || mapped.name || mapped.vorname || 'Meta Lead',
            mapped.email || mapped.e_mail || `meta-${Date.now()}-${Math.random().toString(36).slice(2)}@unknown.com`,
            mapped.phone_number || mapped.phone || mapped.telefon || '',
            mapped.city || mapped.stadt || '',
            mapped.plz || mapped.zip || mapped.postleitzahl || '',
            leadData.ad_name || leadData.campaign_name || leadData.adgroup_name || '',
          );
        }
      }
    } else if (body.form_data || body.email || body.name || body.field_data) {
      const fieldData = body.field_data || [];
      const mapped: Record<string, string> = {};
      for (const field of fieldData) {
        mapped[(field.name || '').toLowerCase()] = Array.isArray(field.values) ? field.values[0] : field.value || '';
      }
      await insertLead(
        mapped.full_name || mapped.name || body.name || 'Meta Lead',
        mapped.email || body.email || `meta-${Date.now()}@unknown.com`,
        mapped.phone_number || mapped.phone || body.phone || '',
        mapped.city || body.city || '',
        mapped.plz || body.plz || body.zip || '',
        body.campaign_name || body.ad_name || '',
      );
    }

    return new Response(JSON.stringify({ success: true, inserted: inserted.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Meta webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
