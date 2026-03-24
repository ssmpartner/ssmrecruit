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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // TikTok webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const verifyToken = url.searchParams.get('verify_token');
      const challenge = url.searchParams.get('challenge');
      const storedToken = Deno.env.get('TIKTOK_VERIFY_TOKEN');

      if (verifyToken && storedToken && verifyToken === storedToken && challenge) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      return new Response('Verification failed', { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    console.log('TikTok webhook payload:', JSON.stringify(body));

    const leads: Array<{ name?: string; email?: string; phone?: string; city?: string; plz?: string; [key: string]: unknown }> = [];

    if (body.event === 'lead' && body.data) {
      leads.push(body.data);
    } else if (body.leads && Array.isArray(body.leads)) {
      leads.push(...body.leads);
    } else if (body.form_data || body.email || body.name) {
      if (body.form_data) {
        const mapped: Record<string, string> = {};
        for (const field of body.form_data) {
          mapped[field.name?.toLowerCase()] = field.value;
        }
        leads.push({
          name: mapped.name || mapped.full_name || mapped.vorname || '',
          email: mapped.email || mapped.e_mail || '',
          phone: mapped.phone || mapped.phone_number || mapped.telefon || '',
          city: mapped.city || mapped.stadt || '',
          plz: mapped.plz || mapped.zip || '',
        });
      } else {
        leads.push(body);
      }
    } else {
      leads.push(body);
    }

    // Get default agency & employee
    const { data: hauptsitz } = await supabase.from('agencies').select('id').ilike('name', '%hauptsitz%').limit(1).single();
    const defaultAgencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
    const { data: defaultEmp } = await supabase.from('employees').select('id').eq('agency_id', defaultAgencyId).limit(1).single();
    const defaultEmployeeId = defaultEmp?.id || (await supabase.from('employees').select('id').limit(1).single()).data?.id;

    if (!defaultAgencyId || !defaultEmployeeId) {
      throw new Error('No default agency or employee found for lead assignment');
    }

    const inserted = [];

    for (const lead of leads) {
      const name = lead.name || lead.full_name as string || 'TikTok Lead';
      const email = lead.email || `tiktok-${Date.now()}@unknown.com`;
      const phone = lead.phone || lead.phone_number as string || '';
      const city = lead.city || '';
      const plz = lead.plz || lead.zip as string || '';
      const campaign = lead.campaign_name as string || lead.ad_name as string || body.campaign_name || '';

      // Try PLZ-based resolution
      const locationMatch = plz ? await resolveAgencyByPlz(supabase, plz) : null;
      const agencyId = locationMatch?.agencyId || defaultAgencyId;
      const employeeId = locationMatch?.employeeId || defaultEmployeeId;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data, error } = await supabase.from('leads').insert({
        id, name, email: email as string, phone: phone as string,
        city: city as string, plz: plz as string,
        source: 'tiktok', status: 'new', campaign,
        agency_id: agencyId, employee_id: employeeId,
        notes: 'Automatisch importiert via TikTok Lead Ads',
        created_at: now, updated_at: now,
      }).select().single();

      if (error) {
        console.error('Error inserting TikTok lead:', error);
      } else {
        inserted.push(data);
        await supabase.from('activities').insert({ id: crypto.randomUUID(), lead_id: id, type: 'status_change', description: 'Lead automatisch via TikTok Lead Ads importiert', user: 'System', created_at: now });
        await supabase.from('notifications').insert({ title: 'Neuer TikTok Lead', type: 'new_lead', description: `${name} wurde via TikTok Lead Ads importiert.`, lead_id: id });
      }
    }

    return new Response(JSON.stringify({ success: true, inserted: inserted.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TikTok webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
