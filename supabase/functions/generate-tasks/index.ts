import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mandatory tasks aligned with the 5-step recruiting process
const PHASE_TASKS: Record<string, { title: string; description: string; priority: string }[]> = {
  new: [
    { title: "Lead-Daten prüfen & vervollständigen", description: "Kontaktdaten, PLZ/Ort und Agentur-Zuweisung überprüfen", priority: "high" },
    { title: "Erstkontakt herstellen", description: "Kandidaten telefonisch kontaktieren und Interesse klären", priority: "urgent" },
    { title: "Kontaktergebnis dokumentieren", description: "Ergebnis des Erstkontakts im System festhalten", priority: "high" },
  ],
  contacted: [
    { title: "Termin für Erstgespräch vereinbaren", description: "Geeigneten Zeitslot für das erste Interview finden", priority: "high" },
    { title: "DISC/Insights-Test versenden", description: "Persönlichkeitstest-Link an den Kandidaten senden", priority: "high" },
    { title: "Gesprächsleitfaden vorbereiten", description: "Fragen und Themen für das Gespräch zusammenstellen", priority: "medium" },
  ],
  appointment: [
    { title: "Erstgespräch durchführen", description: "Strukturiertes Interview mit dem Kandidaten führen", priority: "urgent" },
    { title: "Gesprächsnotizen dokumentieren", description: "Eindrücke und Bewertung unmittelbar festhalten", priority: "high" },
    { title: "DISC-Test Status prüfen", description: "Prüfen ob der Kandidat den Persönlichkeitstest bereits ausgefüllt hat", priority: "medium" },
    { title: "Dokumente vorab anfordern", description: "CV, Zeugnisse und Zertifikate beim Kandidaten anfragen", priority: "medium" },
  ],
  follow_up: [
    { title: "DISC-Ergebnisse auswerten & besprechen", description: "Persönlichkeitsprofil als Gesprächsgrundlage nutzen", priority: "high" },
    { title: "Eingereichte Dokumente prüfen", description: "Vollständigkeit und Qualität der Unterlagen validieren", priority: "high" },
    { title: "Follow-up Termin vereinbaren", description: "Folgegespräch zur Vertiefung terminieren", priority: "high" },
    { title: "Interne Freigabe einholen", description: "Bewertung und Empfehlung für Entscheidungsträger vorbereiten", priority: "urgent" },
  ],
  hired: [
    { title: "Willkommensnachricht senden", description: "Kandidaten über erfolgreiche Einstellung informieren", priority: "urgent" },
    { title: "Onboarding vorbereiten", description: "Einarbeitungsplan und Starttermin festlegen", priority: "high" },
    { title: "Vertragsdokumente erstellen", description: "Arbeitsvertrag vorbereiten und zur Unterschrift senden", priority: "urgent" },
  ],
  rejected: [
    { title: "Absage kommunizieren", description: "Kandidaten respektvoll über die Entscheidung informieren", priority: "high" },
    { title: "Ablehnungsgrund dokumentieren", description: "Gründe für zukünftige Referenz und Analyse festhalten", priority: "medium" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadName, leadStatus, leadPosition, assignedTo, agencyId, existingTasks } = await req.json();

    if (!leadId || !leadStatus || !assignedTo || !agencyId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get mandatory phase tasks
    const phaseTasks = (PHASE_TASKS[leadStatus] || []).map((t) => ({
      ...t,
      source: "system",
      lead_id: leadId,
      assigned_to: assignedTo,
      agency_id: agencyId,
      lead_status: leadStatus,
      status: "open",
    }));

    // Filter out tasks that already exist for this lead+status
    const existingTitles = new Set((existingTasks || []).map((t: any) => t.title));
    const newPhaseTasks = phaseTasks.filter((t) => !existingTitles.has(t.title));

    // 2. Generate AI supplementary tasks
    let aiTasks: any[] = [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY) {
      try {
        const prompt = `Du bist ein Recruiting-Experte für den Schweizer Markt. Ein Lead befindet sich in der Phase "${leadStatus}".
Lead-Name: ${leadName || "Unbekannt"}
Position/Anrede: ${leadPosition || "Nicht angegeben"}
Bereits vorhandene Aufgaben: ${[...existingTitles, ...newPhaseTasks.map(t => t.title)].join(", ") || "Keine"}

Erstelle genau 2 zusätzliche, kontextbezogene Aufgaben die über die Standard-Prozessschritte hinausgehen.
Jede Aufgabe soll praktisch und sofort umsetzbar sein.

Antworte NUR mit einem JSON-Array mit genau 2 Objekten:
[{"title": "...", "description": "...", "priority": "medium"}]

Prioritäten: low, medium, high, urgent. Keine anderen Felder.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Du bist ein Recruiting-Assistent. Antworte immer nur mit validem JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiTasks = parsed.map((t: any) => ({
              title: t.title,
              description: t.description,
              priority: t.priority || "medium",
              source: "ai",
              lead_id: leadId,
              assigned_to: assignedTo,
              agency_id: agencyId,
              lead_status: leadStatus,
              status: "open",
            }));
          }
        } else if (response.status === 429) {
          console.warn("AI rate limited, skipping AI tasks");
        } else if (response.status === 402) {
          console.warn("AI credits exhausted, skipping AI tasks");
        }
      } catch (aiError) {
        console.error("AI task generation failed:", aiError);
      }
    }

    const allNewTasks = [...newPhaseTasks, ...aiTasks];

    return new Response(JSON.stringify({ tasks: allNewTasks }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tasks error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
