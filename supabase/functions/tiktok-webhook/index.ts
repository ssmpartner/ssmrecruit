import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLZ_CANTON_MAP: [number, number, string, string][] = [
  [1000,1199,"Waadt","VD"],[1200,1299,"Genf","GE"],[1300,1499,"Waadt","VD"],
  [1500,1799,"Freiburg","FR"],[1800,1899,"Waadt","VD"],[1900,1999,"Wallis","VS"],
  [2000,2499,"Neuenburg","NE"],[2500,2699,"Bern","BE"],[2800,2999,"Jura","JU"],
  [3000,3899,"Bern","BE"],[3900,3999,"Wallis","VS"],
  [4000,4099,"Basel-Stadt","BS"],[4100,4199,"Basel-Landschaft","BL"],
  [4200,4399,"Solothurn","SO"],[4400,4499,"Basel-Landschaft","BL"],[4500,4999,"Solothurn","SO"],
  [5000,5999,"Aargau","AG"],
  [6000,6299,"Luzern","LU"],[6300,6399,"Zug","ZG"],
  [6400,6459,"Schwyz","SZ"],[6460,6499,"Uri","UR"],[6500,6999,"Tessin","TI"],
  [7000,7799,"Graubünden","GR"],
  [8000,8199,"Zürich","ZH"],[8200,8279,"Schaffhausen","SH"],
  [8280,8289,"Thurgau","TG"],[8300,8499,"Zürich","ZH"],
  [8500,8599,"Thurgau","TG"],[8600,8639,"Zürich","ZH"],
  [8640,8649,"St. Gallen","SG"],[8650,8749,"Zürich","ZH"],
  [8750,8759,"Glarus","GL"],[8760,8852,"Zürich","ZH"],
  [8853,8853,"Schwyz","SZ"],[8854,8999,"Zürich","ZH"],
  [9000,9049,"St. Gallen","SG"],[9050,9059,"Appenzell I.Rh.","AI"],
  [9060,9099,"St. Gallen","SG"],[9100,9199,"Appenzell A.Rh.","AR"],
  [9200,9699,"St. Gallen","SG"],
];

function lookupCantonByPlz(plz: string): { canton: string; cantonCode: string } | null {
  const num = parseInt(plz, 10);
  if (isNaN(num)) return null;
  let best: { canton: string; cantonCode: string } | null = null;
  let bestSize = 999999;
  for (const [lo, hi, canton, code] of PLZ_CANTON_MAP) {
    if (num >= lo && num <= hi && (hi - lo) < bestSize) {
      best = { canton, cantonCode: code };
      bestSize = hi - lo;
    }
  }
  return best;
}

async function enrichAddressViaMapbox(plz: string, city: string): Promise<{ city: string; canton: string; cantonCode: string } | null> {
  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
  if (!MAPBOX_TOKEN) return null;
  const query = [plz, city].filter(Boolean).join(' ');
  if (query.length < 2) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CH&language=de&types=address,place&limit=1&autocomplete=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    const context = f.context || [];
    const place = context.find((c: any) => c.id?.startsWith("place"))?.text || "";
    const regionCode = context.find((c: any) => c.id?.startsWith("region"))?.short_code?.replace("CH-", "") || "";
    const region = context.find((c: any) => c.id?.startsWith("region"))?.text || "";
    const isPlace = f.place_type?.includes("place");
    return { city: isPlace ? f.text : (place || ""), canton: region, cantonCode: regionCode };
  } catch { return null; }
}

async function resolveLocation(plz: string, city: string) {
  if (plz) {
    const local = lookupCantonByPlz(plz);
    if (local) return { city: city || "", ...local };
  }
  return await enrichAddressViaMapbox(plz, city);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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

    const { data: hauptsitz } = await supabase.from('agencies').select('id').ilike('name', '%hauptsitz%').limit(1).single();
    const defaultAgencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
    const { data: defaultEmp } = await supabase.from('employees').select('id').eq('agency_id', defaultAgencyId).limit(1).single();
    const defaultEmployeeId = defaultEmp?.id || (await supabase.from('employees').select('id').limit(1).single()).data?.id;

    if (!defaultAgencyId || !defaultEmployeeId) {
      throw new Error('No default agency or employee found');
    }

    const inserted = [];

    for (const lead of leads) {
      const name = lead.name || lead.full_name as string || 'TikTok Lead';
      const email = lead.email || `tiktok-${Date.now()}@unknown.com`;
      const phone = lead.phone || lead.phone_number as string || '';
      const city = lead.city || '';
      const plz = lead.plz || lead.zip as string || '';
      const campaign = lead.campaign_name as string || lead.ad_name as string || body.campaign_name || '';

      // Auto-enrich address data
      const location = await resolveLocation(plz as string, city as string);
      const finalCity = city || location?.city || '';
      const finalCanton = location?.canton || '';
      const finalCantonCode = location?.cantonCode || '';

      // Resolve agency by canton
      let agencyId = defaultAgencyId;
      let employeeId = defaultEmployeeId;
      if (finalCantonCode) {
        const { data: resolvedAgency } = await supabase.rpc('resolve_agency_by_canton', { _canton_code: finalCantonCode });
        if (resolvedAgency) {
          agencyId = resolvedAgency;
          const { data: emp } = await supabase.from('employees').select('id').eq('agency_id', agencyId).limit(1).single();
          if (emp?.id) employeeId = emp.id;
        }
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data, error } = await supabase.from('leads').insert({
        id, name, email: email as string, phone: phone as string,
        city: finalCity as string, plz: plz as string,
        canton: finalCanton, canton_code: finalCantonCode,
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
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TikTok webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
