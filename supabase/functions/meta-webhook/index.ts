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

async function getDefaultAssignment(supabase: any) {
  const { data: hauptsitz } = await supabase.from('agencies').select('id').ilike('name', '%hauptsitz%').limit(1).single();
  const agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
  if (!agencyId) throw new Error('No agency found');
  const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: agencyId });
  const employeeId = empId || (await supabase.from('employees').select('id').limit(1).single()).data?.id;
  if (!employeeId) throw new Error('No employee found');
  return { agencyId, employeeId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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

    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify HMAC-SHA256 signature when META_APP_SECRET is configured
    const appSecret = Deno.env.get('META_APP_SECRET');
    if (appSecret) {
      const signatureHeader = req.headers.get('x-hub-signature-256') || '';
      const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : '';
      if (!provided) {
        console.warn('Meta webhook: missing X-Hub-Signature-256');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
      );
      const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
      const expected = Array.from(new Uint8Array(sigBuf))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      // Constant-time comparison
      if (expected.length !== provided.length) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
      if (diff !== 0) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn('Meta webhook: META_APP_SECRET not configured — signature verification disabled');
    }

    const body = JSON.parse(rawBody);
    console.log('Meta webhook payload:', JSON.stringify(body));
    const defaults = await getDefaultAssignment(supabase);
    const inserted = [];

    async function insertLead(name: string, email: string, phone: string, city: string, plz: string, campaign: string) {
      // Auto-enrich address data
      const location = await resolveLocation(plz, city);
      const finalCity = city || location?.city || '';
      const finalCanton = location?.canton || '';
      const finalCantonCode = location?.cantonCode || '';

      // Resolve agency by canton
      let agencyId = defaults.agencyId;
      let employeeId = defaults.employeeId;
      if (finalCantonCode) {
        const { data: resolvedAgency } = await supabase.rpc('resolve_agency_by_canton', { _canton_code: finalCantonCode });
        if (resolvedAgency) {
          agencyId = resolvedAgency;
          const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: agencyId });
          if (empId) employeeId = empId;
        }
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Check for duplicate - assign to Hauptsitz if found
      let finalAgencyId = agencyId;
      let finalEmployeeId = employeeId;
      let isDuplicate = false;
      let duplicateNote = '';
      
      if (email && !email.includes('@unknown.com')) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id, name')
          .ilike('email', email)
          .eq('lead_lifecycle', 'active')
          .limit(1)
          .single();
        if (existing) {
          isDuplicate = true;
          duplicateNote = `⚠️ Mögliches Duplikat von "${existing.name}" (ID: ${existing.id}). `;
          finalAgencyId = defaults.agencyId; // Hauptsitz
          finalEmployeeId = defaults.employeeId;
        }
      }

      const { data, error } = await supabase.from('leads').insert({
        id, name, email, phone,
        city: finalCity, plz,
        canton: finalCanton, canton_code: finalCantonCode,
        source: 'meta', status: 'new', campaign,
        agency_id: finalAgencyId, employee_id: finalEmployeeId,
        notes: duplicateNote + 'Automatisch importiert via Meta Lead Ads',
        created_at: now, updated_at: now,
      }).select().single();

      if (error) { console.error('Error inserting Meta lead:', error); return; }
      inserted.push(data);
      await supabase.from('activities').insert({ id: crypto.randomUUID(), lead_id: id, type: 'status_change', description: 'Lead automatisch via Meta Lead Ads importiert', user: 'System', created_at: now });
      
      if (isDuplicate) {
        await supabase.from('notifications').insert({ title: 'Duplikat erkannt – Lead zur Prüfung', type: 'duplicate_detected', description: `${name} wurde als mögliches Duplikat erkannt und dem Hauptsitz zugewiesen.`, lead_id: id });
      } else {
        await supabase.from('notifications').insert({ title: 'Neuer Meta Lead', type: 'new_lead', description: `${name} wurde via Meta Lead Ads importiert.`, lead_id: id });
      }
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
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Meta webhook error:', error);
    return new Response(JSON.stringify({ error: 'Interner Fehler. Bitte versuchen Sie es erneut.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
