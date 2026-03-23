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

    // POST: receive lead data from TikTok
    const body = await req.json();
    console.log('TikTok webhook payload:', JSON.stringify(body));

    // TikTok Lead Ads sends data in different formats depending on setup
    // Support both direct lead data and TikTok's event wrapper
    const leads: Array<{
      name?: string;
      email?: string;
      phone?: string;
      city?: string;
      [key: string]: unknown;
    }> = [];

    if (body.event === 'lead' && body.data) {
      // TikTok event wrapper format
      leads.push(body.data);
    } else if (body.leads && Array.isArray(body.leads)) {
      // Batch format
      leads.push(...body.leads);
    } else if (body.form_data || body.email || body.name) {
      // Direct lead or form_data format
      if (body.form_data) {
        // TikTok form_data is array of {name, value} pairs
        const mapped: Record<string, string> = {};
        for (const field of body.form_data) {
          mapped[field.name?.toLowerCase()] = field.value;
        }
        leads.push({
          name: mapped.name || mapped.full_name || mapped.vorname || '',
          email: mapped.email || mapped.e_mail || '',
          phone: mapped.phone || mapped.phone_number || mapped.telefon || '',
          city: mapped.city || mapped.stadt || '',
        });
      } else {
        leads.push(body);
      }
    } else {
      console.log('Unknown TikTok payload format, storing raw');
      leads.push(body);
    }

    // Get default agency & employee for auto-assignment
    const { data: defaultAgency } = await supabase
      .from('agencies')
      .select('id')
      .limit(1)
      .single();

    const { data: defaultEmployee } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
      .single();

    if (!defaultAgency || !defaultEmployee) {
      throw new Error('No default agency or employee found for lead assignment');
    }

    const inserted = [];

    for (const lead of leads) {
      const name = lead.name || lead.full_name as string || 'TikTok Lead';
      const email = lead.email || `tiktok-${Date.now()}@unknown.com`;
      const phone = lead.phone || lead.phone_number as string || '';
      const city = lead.city || '';
      const campaign = lead.campaign_name as string || lead.ad_name as string || body.campaign_name || '';

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data, error } = await supabase.from('leads').insert({
        id,
        name,
        email: email as string,
        phone: phone as string,
        city: city as string,
        source: 'tiktok',
        status: 'new',
        campaign,
        agency_id: defaultAgency.id,
        employee_id: defaultEmployee.id,
        notes: `Automatisch importiert via TikTok Lead Ads`,
        created_at: now,
        updated_at: now,
      }).select().single();

      if (error) {
        console.error('Error inserting TikTok lead:', error);
      } else {
        inserted.push(data);

        // Create activity
        await supabase.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id: id,
          type: 'status_change',
          description: `Lead automatisch via TikTok Lead Ads importiert`,
          user: 'System',
          created_at: now,
        });

        // Create notification
        await supabase.from('notifications').insert({
          title: 'Neuer TikTok Lead',
          type: 'new_lead',
          description: `${name} wurde via TikTok Lead Ads importiert.`,
          lead_id: id,
        });
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
