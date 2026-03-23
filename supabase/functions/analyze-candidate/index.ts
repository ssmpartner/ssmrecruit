import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { disc_scores, motivator_scores, wizard_answers, ssm_criteria, lead_name } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du bist eine intelligente Recruiting- und Persönlichkeits-Analyse-Engine für SSM Recruit.

Du analysierst Kandidaten basierend auf:
- DISC Verhalten (D=Dominanz, I=Initiative, S=Stetigkeit, C=Gewissenhaftigkeit)
- 6 Motivatoren (Individualistisch, Theoretisch, Ökonomisch, Traditionell, Ästhetisch, Sozial)
- Wizard-Antworten (Arbeitsstil, Ziele, Selbstbild)
- SSM Match-Kriterien des Unternehmens

Erstelle eine umfassende Analyse mit professionellem, klarem Ton. Nicht zu technisch.
Interpretiere Antworten intelligent, erkenne Widersprüche, hebe Stärken hervor, benenne Risiken ehrlich.`;

    const userPrompt = `Analysiere folgenden Kandidaten:

**Name:** ${lead_name || 'Kandidat'}

**DISC Scores (0-100):**
- Dominanz (D): ${disc_scores?.D || 0}
- Initiative (I): ${disc_scores?.I || 0}
- Stetigkeit (S): ${disc_scores?.S || 0}
- Gewissenhaftigkeit (C): ${disc_scores?.C || 0}

**Motivator Scores (0-100):**
- Individualistisch: ${motivator_scores?.individualistisch || 0}
- Theoretisch: ${motivator_scores?.theoretisch || 0}
- Ökonomisch: ${motivator_scores?.oekonomisch || 0}
- Traditionell: ${motivator_scores?.traditionell || 0}
- Ästhetisch: ${motivator_scores?.aesthetisch || 0}
- Sozial: ${motivator_scores?.sozial || 0}

**Wizard-Antworten:**
${Object.entries(wizard_answers || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**SSM Match-Kriterien:**
${ssm_criteria ? JSON.stringify(ssm_criteria, null, 2) : 'Keine spezifischen Kriterien definiert'}

Erstelle die vollständige Analyse.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_candidate_analysis",
              description: "Generiert eine vollständige Kandidatenanalyse mit Scores, Matching und Empfehlung",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      headline: { type: "string", description: "Kurze Überschrift zum Profil (max 10 Worte)" },
                      description: { type: "string", description: "Persönliche Zusammenfassung in max 5 Sätzen" },
                      dominant_disc: { type: "string", enum: ["D", "I", "S", "C"] },
                      dominant_motivator: { type: "string" },
                    },
                    required: ["headline", "description", "dominant_disc", "dominant_motivator"],
                  },
                  scores: {
                    type: "object",
                    properties: {
                      performance: { type: "number", description: "Performance Score 0-100" },
                      team_fit: { type: "number", description: "Team Fit Score 0-100" },
                      learning: { type: "number", description: "Learning/Adaptability Score 0-100" },
                      sales: { type: "number", description: "Sales Potential Score 0-100" },
                      culture_fit: { type: "number", description: "Culture Fit Score 0-100" },
                    },
                    required: ["performance", "team_fit", "learning", "sales", "culture_fit"],
                  },
                  match_result: {
                    type: "object",
                    properties: {
                      score: { type: "number", description: "Match Score 0-100" },
                      level: { type: "string", enum: ["perfect", "very_good", "conditional", "no_match"] },
                      strengths: { type: "array", items: { type: "string" }, description: "Stärken für SSM (3-5 Punkte)" },
                      risks: { type: "array", items: { type: "string" }, description: "Risiken für SSM (2-4 Punkte)" },
                    },
                    required: ["score", "level", "strengths", "risks"],
                  },
                  recommendation: {
                    type: "string",
                    enum: ["einstellen", "weiter_pruefen", "ablehnen"],
                    description: "Klare Empfehlung",
                  },
                  recommendation_reason: {
                    type: "string",
                    description: "Begründung der Empfehlung in 2-3 Sätzen",
                  },
                  report_sections: {
                    type: "object",
                    properties: {
                      disc_analysis: { type: "string", description: "DISC Verhaltensanalyse (3-5 Sätze)" },
                      motivator_analysis: { type: "string", description: "Motivatoren-Analyse (3-5 Sätze)" },
                      integration: { type: "string", description: "Integration Verhalten + Motivatoren (3-5 Sätze)" },
                      strengths_profile: { type: "array", items: { type: "string" }, description: "Top 5 Stärken" },
                      improvement_areas: { type: "array", items: { type: "string" }, description: "3-4 Verbesserungsbereiche" },
                      natural_vs_adapted: { type: "string", description: "Natürlicher vs adaptierter Stil (2-3 Sätze)" },
                      communication_do: { type: "array", items: { type: "string" }, description: "Kommunikations-DOs (3-5 Punkte)" },
                      communication_dont: { type: "array", items: { type: "string" }, description: "Kommunikations-DON'Ts (3-5 Punkte)" },
                      company_value: { type: "string", description: "Wert für das Unternehmen (3-5 Sätze)" },
                    },
                    required: ["disc_analysis", "motivator_analysis", "integration", "strengths_profile", "improvement_areas", "natural_vs_adapted", "communication_do", "communication_dont", "company_value"],
                  },
                },
                required: ["summary", "scores", "match_result", "recommendation", "recommendation_reason", "report_sections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_candidate_analysis" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Guthaben aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-candidate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
