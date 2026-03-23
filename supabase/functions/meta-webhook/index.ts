import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // POST: receive lead data from Meta Lead Ads
    const body = await req.json();
    console.log('Meta webhook payload:', JSON.stringify(body));

    // Find agency "Hauptsitz"
    const { data: hauptsitz } = await supabase
      .from('agencies')
      .select('id')
      .ilike('name', '%hauptsitz%')
      .limit(1)
      .single();

    // Fallback to first agency if Hauptsitz not found
    const agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;

    if (!agencyId) {
      throw new Error('No agency found for lead assignment');
    }

    // Get default employee from that agency
    const { data: defaultEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('agency_id', agencyId)
      .limit(1)
      .single();

    const employeeId = defaultEmployee?.id || (await supabase.from('employees').select('id').limit(1).single()).data?.id;

    if (!employeeId) {
      throw new Error('No employee found for lead assignment');
    }

    const inserted = [];

    // Meta sends data in the format: { object, entry: [{ changes: [{ value: { leadgen_id, ... } }] }] }
    if (body.object === 'page' && body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.field !== 'leadgen') continue;
          const leadData = change.value;

          // Meta Lead Ads sends leadgen_id — we need to fetch lead details via Graph API
          // But if the payload already contains field_data, use it directly
          const fieldData = leadData.field_data || [];
          const mapped: Record<string, string> = {};
          for (const field of fieldData) {
            const key = (field.name || '').toLowerCase();
            const val = Array.isArray(field.values) ? field.values[0] : field.value || '';
            mapped[key] = val;
          }

          const name = mapped.full_name || mapped.name || mapped.vorname || 'Meta Lead';
          const email = mapped.email || mapped.e_mail || `meta-${Date.now()}-${Math.random().toString(36).slice(2)}@unknown.com`;
          const phone = mapped.phone_number || mapped.phone || mapped.telefon || '';
          const city = mapped.city || mapped.stadt || '';
          const campaign = leadData.ad_name || leadData.campaign_name || leadData.adgroup_name || '';

          const id = crypto.randomUUID();
          const now = new Date().toISOString();

          const { data, error } = await supabase.from('leads').insert({
            id,
            name,
            email,
            phone,
            city,
            source: 'meta',
            status: 'new',
            campaign,
            agency_id: agencyId,
            employee_id: employeeId,
            notes: `Automatisch importiert via Meta Lead Ads. Leadgen-ID: ${leadData.leadgen_id || 'n/a'}`,
            created_at: now,
            updated_at: now,
          }).select().single();

          if (error) {
            console.error('Error inserting Meta lead:', error);
          } else {
            inserted.push(data);

            await supabase.from('activities').insert({
              id: crypto.randomUUID(),
              lead_id: id,
              type: 'status_change',
              description: `Lead automatisch via Meta Lead Ads importiert`,
              user: 'System',
              created_at: now,
            });

            await supabase.from('notifications').insert({
              title: 'Neuer Meta Lead',
              type: 'new_lead',
              description: `${name} wurde via Meta Lead Ads importiert.`,
              lead_id: id,
            });
          }
        }
      }
    } else if (body.form_data || body.email || body.name || body.field_data) {
      // Direct/manual test format
      const fieldData = body.field_data || [];
      const mapped: Record<string, string> = {};
      for (const field of fieldData) {
        mapped[(field.name || '').toLowerCase()] = Array.isArray(field.values) ? field.values[0] : field.value || '';
      }

      const name = mapped.full_name || mapped.name || body.name || 'Meta Lead';
      const email = mapped.email || body.email || `meta-${Date.now()}@unknown.com`;
      const phone = mapped.phone_number || mapped.phone || body.phone || '';
      const city = mapped.city || body.city || '';
      const campaign = body.campaign_name || body.ad_name || '';

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data, error } = await supabase.from('leads').insert({
        id,
        name,
        email,
        phone,
        city,
        source: 'meta',
        status: 'new',
        campaign,
        agency_id: agencyId,
        employee_id: employeeId,
        notes: `Automatisch importiert via Meta Lead Ads`,
        created_at: now,
        updated_at: now,
      }).select().single();

      if (error) {
        console.error('Error inserting Meta lead:', error);
      } else {
        inserted.push(data);

        await supabase.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id: id,
          type: 'status_change',
          description: `Lead automatisch via Meta Lead Ads importiert`,
          user: 'System',
          created_at: now,
        });

        await supabase.from('notifications').insert({
          title: 'Neuer Meta Lead',
          type: 'new_lead',
          description: `${name} wurde via Meta Lead Ads importiert.`,
          lead_id: id,
        });
      }
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
