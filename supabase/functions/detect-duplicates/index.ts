import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leads } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const leadsStr = leads.map((l: any) =>
      `ID:${l.id} | Name:${l.name} | Email:${l.email} | Phone:${l.phone} | PLZ:${l.plz} | City:${l.city} | Position:${l.position}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Du bist ein Duplikat-Erkennungssystem für Leads in einem Recruiting-CRM.
Analysiere die folgenden Leads und finde potenzielle Duplikate basierend auf:
- Ähnliche Namen (Tippfehler, Abkürzungen, gleiche Person)
- Gleiche oder ähnliche E-Mail-Adressen
- Gleiche Telefonnummern
- Gleiche Kombination aus PLZ + Stadt + Position

Gib NUR das JSON-Ergebnis zurück, keine Erklärungen.`
          },
          {
            role: "user",
            content: `Finde Duplikate in diesen Leads:\n\n${leadsStr}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_duplicates",
              description: "Report found duplicate lead pairs with confidence scores",
              parameters: {
                type: "object",
                properties: {
                  duplicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        leadId1: { type: "string", description: "ID of first lead" },
                        leadId2: { type: "string", description: "ID of second lead" },
                        confidence: { type: "number", description: "Confidence score 0-100" },
                        reason: { type: "string", description: "Reason why these are duplicates (German)" }
                      },
                      required: ["leadId1", "leadId2", "confidence", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["duplicates"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_duplicates" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte versuchen Sie es später erneut." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Guthaben aufgebraucht. Bitte laden Sie Ihr Guthaben auf." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "KI-Gateway Fehler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ duplicates: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-duplicates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
