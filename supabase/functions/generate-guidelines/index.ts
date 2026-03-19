import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Full SSM Recruit capabilities context for AI
const RECRUITFLOW_CONTEXT = `
SSM Recruit ist ein Recruiting-Management-System mit folgenden Funktionen:
- Lead-Erfassung über Webhooks/API (TikTok, Meta, LinkedIn, Website, CSV-Import)
- Automatische Kanton-Zuweisung basierend auf PLZ (Schweizer Kantone)
- Multi-Agentur-Verwaltung mit regionalen Einschränkungen (erlaubte Kantone pro Agentur)
- Mitarbeiter-Zuweisung und Rollenmanagement (Admin, Employee)
- Vollständiger Recruiting-Workflow: Neu → Kontaktiert → Terminiert → Gespräch 1 → Insights (DISC-Test) → Gespräch 2 → Eingestellt/Abgelehnt
- DISC-Persönlichkeitstest mit automatischer Auswertung (D/I/S/C Scores)
- Video-Call Integration (Jitsi)
- Termin-Management (Telefon, Video, Vor-Ort)
- KI-gestützte Aufgabengenerierung pro Phase
- KI-basierte Duplikaterkennung und Lead-Zusammenführung
- Lead-Archivierung und Löschung mit Bestätigungsdialogen
- Automatisierungen (Status-Wechsel-Trigger, Inaktivitäts-Erinnerungen, Auto-Zuweisung)
- Benachrichtigungssystem
- Analytics & Reporting (Konversionsrate, Pipeline-Statistiken)
- Aktivitäten-Protokollierung
- Notizen pro Lead
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepStatus, stepTitle, stepDescription, existingGuidelines } = await req.json();

    if (!stepStatus || !stepTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingTexts = (existingGuidelines || []).map((g: any) => g.text).join("\n- ");

    const prompt = `Du bist ein Experte für Recruiting-Prozesse und kennst das SSM Recruit-System im Detail.

${RECRUITFLOW_CONTEXT}

Erstelle für die Phase "${stepTitle}" (Status: ${stepStatus}) passende Richtlinien und Regeln.
Phasenbeschreibung: ${stepDescription}

${existingTexts ? `Bereits vorhandene Richtlinien:\n- ${existingTexts}\n\nErstelle NUR neue, noch nicht vorhandene Richtlinien.` : "Es gibt noch keine Richtlinien für diese Phase."}

Berücksichtige ALLE Szenarien die mit RecruitFlow in dieser Phase möglich sind:
- Datenqualität und Vollständigkeit
- Zeitliche Vorgaben und Fristen
- Kommunikationsregeln
- Eskalationspfade
- Datenschutz und Compliance
- Nutzung der verfügbaren System-Features (DISC-Test, Video-Call, Automatisierungen etc.)
- Best Practices im Recruiting

Erstelle 3-5 neue Richtlinien. Antworte NUR mit einem JSON-Array:
[{"text": "...", "type": "rule"}, {"text": "...", "type": "guideline"}]

type "rule" = verbindliche Pflicht-Regel, type "guideline" = empfohlene Richtlinie.
Mische beide Typen sinnvoll.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du bist ein Recruiting-Prozess-Experte. Antworte immer nur mit validem JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Credits aufgebraucht. Bitte Credits aufladen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "KI-Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Ungültige KI-Antwort" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guidelines = JSON.parse(jsonMatch[0]).map((g: any) => ({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: g.text,
      type: g.type === "rule" ? "rule" : "guideline",
    }));

    return new Response(JSON.stringify({ guidelines }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-guidelines error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
