import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Deterministic personality avatar rules ──
function resolvePersonality(disc: Record<string, number>, motivators: Record<string, number>) {
  const discEntries = Object.entries(disc).sort(([,a],[,b]) => b - a);
  const [top1Key, top1Val] = discEntries[0] || ['D', 0];
  const [top2Key, top2Val] = discEntries[1] || ['I', 0];
  const dominant_disc_type = top1Key;
  const combination = `${top1Key}+${top2Key}`;

  const motEntries = Object.entries(motivators).sort(([,a],[,b]) => b - a);
  const top_motivators = motEntries.slice(0, 3).map(([k]) => k);

  // DISC base titles
  const discTitles: Record<string, string> = { D: 'Der Macher', I: 'Der Inspirator', S: 'Der Teamplayer', C: 'Der Analytiker' };
  const comboTitles: Record<string, string> = {
    'D+I': 'Der Challenger', 'I+D': 'Der Challenger',
    'D+C': 'Der Strategische Umsetzer', 'C+D': 'Der Strategische Umsetzer',
    'I+S': 'Der Beziehungsstarke', 'S+I': 'Der Beziehungsstarke',
    'S+C': 'Der Verlässliche Spezialist', 'C+S': 'Der Verlässliche Spezialist',
  };

  // Motivator refinements
  const motTitles: Record<string, string> = {
    'oekonomisch+individualistisch': 'Performance Leader',
    'individualistisch+oekonomisch': 'Performance Leader',
    'sozial+aesthetisch': 'Empathischer Motivator',
    'aesthetisch+sozial': 'Empathischer Motivator',
    'theoretisch+traditionell': 'Strukturierter Experte',
    'traditionell+theoretisch': 'Strukturierter Experte',
    'oekonomisch+theoretisch': 'Analytischer Performer',
    'theoretisch+oekonomisch': 'Analytischer Performer',
    'individualistisch+sozial': 'Führungspersönlichkeit',
    'sozial+individualistisch': 'Führungspersönlichkeit',
  };

  const motKey = `${top_motivators[0]}+${top_motivators[1]}`;
  const motTitle = motTitles[motKey] || '';

  // Use combo if top2 is close enough (>60% of top1)
  const useCombo = top2Val > top1Val * 0.6;
  const discTitle = useCombo ? (comboTitles[combination] || discTitles[top1Key]) : discTitles[top1Key];

  const personality_avatar = useCombo ? combination.toLowerCase().replace('+', '_') : top1Key.toLowerCase();
  const personality_title = motTitle ? `${discTitle} – ${motTitle}` : discTitle;

  return { personality_title, personality_avatar, personality_type_combination: useCombo ? combination : top1Key, dominant_disc_type, top_motivators };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      disc_scores,
      disc_scores_adapted,
      motivator_scores,
      driving_forces_scores,
      driving_forces_groups,
      wizard_answers,
      ssm_criteria,
      lead_name,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du bist eine intelligente Recruiting- und Persönlichkeits-Analyse-Engine für SSM Recruit.

Du analysierst Kandidaten basierend auf:
- DISC Verhalten in zwei Profilen: natürlicher Stil (wie die Person wirklich ist) UND adaptierter Stil (wie sie sich am Arbeitsplatz verhält). Wenn beide deutlich abweichen, deutet das auf Anpassungs-Stress hin.
- 6 Motivatoren (Individualistisch, Theoretisch, Ökonomisch, Traditionell, Ästhetisch, Sozial)
- 12 Driving Forces (Intellektuell/Instinktiv, Ressourcen-bewusst/Selbstlos, Harmoniesuchend/Sachlich, Altruistisch/Zielgerichtet, Führend/Kollaborativ, Strukturiert/Aufgeschlossen). Diese sind in Gruppen aufgeteilt: primär (Top 4 — Haupttreiber), situativ (mittlere 4 — kontextabhängig), indifferent (unteren 4 — nicht relevant).
- Wizard-Antworten (Arbeitsstil, Ziele, Selbstbild)
- SSM Match-Kriterien des Unternehmens

Erstelle eine umfassende, mehrseitige Analyse im Stil eines professionellen Talent-Insights-Reports. Schreibe in der dritten Person ("Sie/Er"), in vollständigen Sätzen, individuell auf die Profilwerte bezogen. Vermeide generische Floskeln.

Berücksichtige besonders:
- Extreme Werte (>80 oder <30)
- Diskrepanz zwischen natürlichem und adaptiertem DISC-Stil (deutet auf Maskierung/Anpassungsdruck hin)
- Konflikte zwischen DISC und Driving Forces (z.B. hoher D + altruistische Top-Force)`;

    const dfList = (driving_forces_scores || {});
    const dfFmt = Object.entries(dfList).map(([k, v]) => `  - ${k}: ${v}`).join('\n');
    const dfGroupFmt = driving_forces_groups
      ? `Primär: ${driving_forces_groups.primaer?.map((x: any) => `${x.force}(${x.score})`).join(', ')}\n  Situativ: ${driving_forces_groups.situativ?.map((x: any) => `${x.force}(${x.score})`).join(', ')}\n  Indifferent: ${driving_forces_groups.indifferent?.map((x: any) => `${x.force}(${x.score})`).join(', ')}`
      : 'Nicht erhoben';

    const userPrompt = `Analysiere folgenden Kandidaten:

**Name:** ${lead_name || 'Kandidat'}

**DISC Scores – Natürlicher Stil (0-100):**
- Dominanz (D): ${disc_scores?.D || 0}
- Initiative (I): ${disc_scores?.I || 0}
- Stetigkeit (S): ${disc_scores?.S || 0}
- Gewissenhaftigkeit (C): ${disc_scores?.C || 0}

**DISC Scores – Adaptierter Stil am Arbeitsplatz (0-100):**
${disc_scores_adapted ? `- Dominanz (D): ${disc_scores_adapted.D || 0}
- Initiative (I): ${disc_scores_adapted.I || 0}
- Stetigkeit (S): ${disc_scores_adapted.S || 0}
- Gewissenhaftigkeit (C): ${disc_scores_adapted.C || 0}` : 'Nicht erhoben'}

**Motivator Scores (0-100):**
- Individualistisch: ${motivator_scores?.individualistisch || 0}
- Theoretisch: ${motivator_scores?.theoretisch || 0}
- Ökonomisch: ${motivator_scores?.oekonomisch || 0}
- Traditionell: ${motivator_scores?.traditionell || 0}
- Ästhetisch: ${motivator_scores?.aesthetisch || 0}
- Sozial: ${motivator_scores?.sozial || 0}

**Driving Forces (12 Antriebe, 0-100):**
${dfFmt || 'Nicht erhoben'}

**Driving Forces Gruppen:**
  ${dfGroupFmt}

**Wizard-Antworten:**
${Object.entries(wizard_answers || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**SSM Match-Kriterien:**
${ssm_criteria ? JSON.stringify(ssm_criteria, null, 2) : 'Keine spezifischen Kriterien definiert'}

Erstelle die vollständige Analyse — alle Pflichtfelder UND die erweiterten Felder (adapted_style_analysis, time_wasters, ideal_environment, keys_to_motivation, keys_to_management, action_plan, behavior_motivator_synergies, behavior_motivator_conflicts, driving_forces_primary/situational/indifferent_text) — als eine zusammenhängende Talent-Insights-Analyse.`;

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
              description: "Generiert eine vollständige Kandidatenanalyse mit Scores, Matching, Empfehlung UND Persönlichkeitsprofil",
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
                      disc_analysis: { type: "string", description: "DISC Verhaltensanalyse (5-8 Sätze, mit konkretem Bezug zu den Score-Werten)" },
                      motivator_analysis: { type: "string", description: "Motivatoren-Analyse (5-8 Sätze)" },
                      integration: { type: "string", description: "Integration Verhalten + Motivatoren (5-8 Sätze)" },
                      strengths_profile: { type: "array", items: { type: "string" }, description: "Top 7-10 Stärken" },
                      improvement_areas: { type: "array", items: { type: "string" }, description: "5-7 Verbesserungsbereiche" },
                      natural_vs_adapted: { type: "string", description: "Vergleich natürlicher vs adaptierter Stil (4-6 Sätze). Erkennt Anpassungsstress wenn Werte stark abweichen." },
                      adapted_style_analysis: { type: "string", description: "Vertiefte Analyse des adaptierten Stils am Arbeitsplatz (4-6 Sätze)" },
                      communication_do: { type: "array", items: { type: "string" }, description: "Kommunikations-DOs (6-10 Punkte)" },
                      communication_dont: { type: "array", items: { type: "string" }, description: "Kommunikations-DON'Ts (6-10 Punkte)" },
                      company_value: { type: "string", description: "Wert für das Unternehmen (6-10 Sätze, sehr personalisiert)" },
                      time_wasters: { type: "array", items: { type: "object", properties: { weakness: { type: "string" }, solution: { type: "string" } }, required: ["weakness", "solution"] }, description: "5-7 Zeitfresser mit konkretem Lösungsvorschlag" },
                      ideal_environment: { type: "array", items: { type: "string" }, description: "8-12 Merkmale des idealen Arbeitsumfelds" },
                      keys_to_motivation: { type: "array", items: { type: "string" }, description: "8-12 Schlüssel zur Motivation" },
                      keys_to_management: { type: "array", items: { type: "string" }, description: "8-12 Führungs-Empfehlungen" },
                      action_plan: { type: "array", items: { type: "string" }, description: "5-8 konkrete Entwicklungs-Schritte" },
                      behavior_motivator_synergies: { type: "array", items: { type: "string" }, description: "5-8 Stärken aus Verhalten+Motivatoren+Driving Forces" },
                      behavior_motivator_conflicts: { type: "array", items: { type: "string" }, description: "4-7 potentielle Konflikte" },
                      driving_forces_primary_text: { type: "string", description: "Primäre Driving Forces als Fließtext, 5-8 Sätze" },
                      driving_forces_situational_text: { type: "string", description: "Situative Driving Forces, 3-5 Sätze" },
                      driving_forces_indifferent_text: { type: "string", description: "Indifferente Driving Forces, 2-3 Sätze" },
                    },
                    required: ["disc_analysis", "motivator_analysis", "integration", "strengths_profile", "improvement_areas", "natural_vs_adapted", "communication_do", "communication_dont", "company_value"],
                  },
                  behavioral_hierarchy: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        trait: { type: "string", description: "Verhaltensfaktor (z.B. Konkurrenzdenken, Diplomatie, Empathie, Genauigkeit, Anpassungsfähigkeit, Entscheidungsfreude, Beharrlichkeit, Organisationsgrad, Kommunikationsstärke, Eigenverantwortung, Detailgenauigkeit, Risikobereitschaft)" },
                        score: { type: "number", description: "0-100" },
                        description: { type: "string", description: "1-2 Sätze Erklärung" },
                      },
                      required: ["trait", "score", "description"],
                    },
                    description: "12 Verhaltens-Hierarchie-Faktoren, sortiert nach Stärke (höchster zuerst), abgeleitet aus DISC+Driving Forces.",
                  },
                  // ── NEW: Personality profile fields ──
                  personality_summary: {
                    type: "string",
                    description: "Wer ist diese Person? Wie arbeitet sie? Was treibt sie an? 6-8 Sätze, individuell und nicht generisch.",
                  },
                  personality_meaning: {
                    type: "string",
                    description: "Was bedeutet dieses Profil im Job? Wo performt diese Person stark? Welche Umgebung passt? 5-7 Sätze.",
                  },
                  personality_strengths_extended: {
                    type: "array",
                    items: { type: "string" },
                    description: "7-10 erweiterte Stärken aus DISC + Motivatoren + Driving Forces.",
                  },
                  personality_risks_extended: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-8 typische Risiken und Verhaltensmuster.",
                  },
                  match_interpretation: {
                    type: "string",
                    description: "Warum passt diese Person zur SSM? Welche Rolle passt am besten? 5-7 Sätze.",
                  },
                },
                required: ["summary", "scores", "match_result", "recommendation", "recommendation_reason", "report_sections", "personality_summary", "personality_meaning", "personality_strengths_extended", "personality_risks_extended", "match_interpretation"],
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

    // ── Enrich with deterministic personality avatar ──
    const personality = resolvePersonality(disc_scores || {}, motivator_scores || {});
    analysis.personality_title = personality.personality_title;
    analysis.personality_avatar = personality.personality_avatar;
    analysis.personality_type_combination = personality.personality_type_combination;
    analysis.dominant_disc_type = personality.dominant_disc_type;
    analysis.top_motivators = personality.top_motivators;

    // ── Deterministische Norm-Referenz (DACH-Bevölkerung, kalibrierbar) ──
    analysis.norm_reference = {
      population: 'Deutschsprachige Bevölkerung (Kalibrierung 2024)',
      bands: { mean: 50, sd: 15, low: 35, high: 65 },
      disc: { D: { mean: 48, sd: 18 }, I: { mean: 52, sd: 17 }, S: { mean: 55, sd: 16 }, C: { mean: 53, sd: 17 } },
      motivators: {
        individualistisch: { mean: 50, sd: 16 }, oekonomisch: { mean: 55, sd: 15 }, theoretisch: { mean: 48, sd: 17 },
        sozial: { mean: 56, sd: 15 }, aesthetisch: { mean: 47, sd: 16 }, traditionell: { mean: 50, sd: 16 },
      },
    };



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
