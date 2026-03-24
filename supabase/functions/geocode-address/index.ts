import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
    if (!MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: "MAPBOX_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, types } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Mapbox Geocoding API v5, restricted to Switzerland
    const searchTypes = types || "address,place";
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CH&language=de&types=${searchTypes}&limit=5&autocomplete=true`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mapbox API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    
    const suggestions = (data.features || []).map((f: any) => {
      const context = f.context || [];
      const postcode = context.find((c: any) => c.id?.startsWith("postcode"))?.text || "";
      const place = context.find((c: any) => c.id?.startsWith("place"))?.text || "";
      const region = context.find((c: any) => c.id?.startsWith("region"))?.text || "";
      const regionCode = context.find((c: any) => c.id?.startsWith("region"))?.short_code?.replace("CH-", "") || "";

      // For place results, the place name is in the feature itself
      const isPlace = f.place_type?.includes("place");
      const cityName = isPlace ? f.text : place;

      return {
        fullAddress: f.place_name,
        street: f.place_type?.includes("address") ? (f.address ? `${f.text} ${f.address}` : f.text) : f.text,
        plz: postcode,
        city: cityName,
        canton: region,
        cantonCode: regionCode,
        coordinates: f.center, // [lng, lat]
      };
    });

    return new Response(JSON.stringify({ suggestions }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Geocode error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
