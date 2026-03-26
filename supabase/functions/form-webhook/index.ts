import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// PLZ ranges to canton mapping for instant local lookup
const PLZ_CANTON_MAP: [number, number, string, string][] = [
  [1000,1199,"Waadt","VD"],[1200,1299,"Genf","GE"],[1300,1499,"Waadt","VD"],
  [1500,1799,"Freiburg","FR"],[1800,1899,"Waadt","VD"],[1900,1999,"Wallis","VS"],
  [2000,2499,"Neuenburg","NE"],[2500,2699,"Bern","BE"],[2800,2999,"Jura","JU"],
  [3000,3899,"Bern","BE"],[3900,3999,"Wallis","VS"],
  [4000,4099,"Basel-Stadt","BS"],[4100,4199,"Basel-Landschaft","BL"],
  [4200,4399,"Solothurn","SO"],[4400,4499,"Basel-Landschaft","BL"],
  [4500,4999,"Solothurn","SO"],
  [5000,5999,"Aargau","AG"],
  [6000,6299,"Luzern","LU"],[6300,6399,"Zug","ZG"],
  [6400,6459,"Schwyz","SZ"],[6460,6499,"Uri","UR"],
  [6500,6999,"Tessin","TI"],
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

async function enrichAddressViaMapbox(plz: string, city: string, address: string): Promise<{ city: string; canton: string; cantonCode: string } | null> {
  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
  if (!MAPBOX_TOKEN) return null;

  const query = [address, plz, city].filter(Boolean).join(' ');
  if (query.length < 2) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CH&language=de&types=address,place&limit=1&autocomplete=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;

    const context = f.context || [];
    const postcode = context.find((c: any) => c.id?.startsWith("postcode"))?.text || "";
    const place = context.find((c: any) => c.id?.startsWith("place"))?.text || "";
    const regionCode = context.find((c: any) => c.id?.startsWith("region"))?.short_code?.replace("CH-", "") || "";
    const region = context.find((c: any) => c.id?.startsWith("region"))?.text || "";
    const isPlace = f.place_type?.includes("place");

    return {
      city: isPlace ? f.text : (place || ""),
      canton: region,
      cantonCode: regionCode,
    };
  } catch (e) {
    console.error("Mapbox enrichment error:", e);
    return null;
  }
}

async function resolveLocation(plz: string, city: string, address: string) {
  // Step 1: Local PLZ lookup
  if (plz) {
    const local = lookupCantonByPlz(plz);
    if (local) return { city: city || "", ...local };
  }
  // Step 2: Mapbox fallback
  return await enrichAddressViaMapbox(plz, city, address);
}

async function resolveAgencyByLocation(supabase: any, cantonCode: string) {
  if (!cantonCode) return null;
  const { data: agencyId } = await supabase.rpc('resolve_agency_by_canton', { _canton_code: cantonCode });
  if (agencyId) {
    const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: agencyId });
    return { agencyId, employeeId: empId };
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Gültige E-Mail-Adresse erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-enrich address data
    const location = await resolveLocation(plz, city, address);
    const finalCity = city || location?.city || '';
    const finalCanton = location?.canton || '';
    const finalCantonCode = location?.cantonCode || '';

    // Resolve agency by canton
    const locationMatch = finalCantonCode ? await resolveAgencyByLocation(supabase, finalCantonCode) : null;

    let agencyId = locationMatch?.agencyId;
    let employeeId = locationMatch?.employeeId;

    if (!agencyId) {
      const { data: hauptsitz } = await supabase.from('agencies').select('id').ilike('name', '%hauptsitz%').limit(1).single();
      agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
    }
    if (!agencyId) throw new Error('Keine Agentur für Lead-Zuweisung gefunden');

    if (!employeeId) {
      const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: agencyId });
      employeeId = empId || (await supabase.from('employees').select('id').limit(1).single()).data?.id;
    }
    if (!employeeId) throw new Error('Kein Mitarbeiter für Lead-Zuweisung gefunden');

    // Check for duplicate
    const { data: existing } = await supabase.from('leads').select('id, name').eq('email', email).limit(1).single();
    if (existing) {
      return new Response(JSON.stringify({
        success: true, duplicate: true,
        message: `Lead mit E-Mail ${email} existiert bereits (${existing.name})`,
        lead_id: existing.id,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabase.from('leads').insert({
      id, name, email, phone,
      city: finalCity, plz, address,
      canton: finalCanton, canton_code: finalCantonCode,
      source: 'website', status: 'new', campaign,
      agency_id: agencyId, employee_id: employeeId,
      notes: notes ? `Website-Formular (${formSource}): ${notes}` : `Automatisch importiert via Website-Formular (${formSource})`,
      created_at: now, updated_at: now,
    }).select().single();

    if (error) {
      console.error('Error inserting form lead:', error);
      throw new Error(`Lead konnte nicht gespeichert werden: ${error.message}`);
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: id, type: 'status_change',
      description: `Lead automatisch via Website-Formular (${formSource}) importiert`,
      user: 'System', created_at: now,
    });

    await supabase.from('notifications').insert({
      title: 'Neuer Website-Lead', type: 'new_lead',
      description: `${name} wurde via Website-Formular importiert.`, lead_id: id,
    });

    return new Response(JSON.stringify({
      success: true, lead_id: id,
      message: `Lead ${name} erfolgreich erstellt`,
      enriched: { city: finalCity, canton: finalCanton, cantonCode: finalCantonCode },
    }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Form webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
