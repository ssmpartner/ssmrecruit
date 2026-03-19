import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize string for comparison
function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Simple similarity score between two strings (0-1)
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  // Levenshtein-based similarity for short strings
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Normalize phone: strip spaces, dashes, dots
function normalizePhone(p: string): string {
  return (p || "").replace(/[\s\-\.\(\)]/g, "");
}

// Normalize email
function normalizeEmail(e: string): string {
  return normalize(e);
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  plz: string;
  city: string;
  position: string;
}

interface DuplicateMatch {
  leadId1: string;
  leadId2: string;
  confidence: number;
  reason: string;
}

function detectDuplicates(leads: Lead[]): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];

  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i];
      const b = leads[j];
      let score = 0;
      const reasons: string[] = [];

      // 1. Exact email match (strongest signal)
      const emailA = normalizeEmail(a.email);
      const emailB = normalizeEmail(b.email);
      if (emailA && emailB && emailA === emailB) {
        score += 50;
        reasons.push("Gleiche E-Mail-Adresse");
      } else if (emailA && emailB) {
        const emailSim = similarity(emailA, emailB);
        if (emailSim >= 0.85) {
          score += 30;
          reasons.push("Ähnliche E-Mail-Adresse");
        }
      }

      // 2. Exact phone match
      const phoneA = normalizePhone(a.phone);
      const phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB && phoneA.length >= 8 && phoneA === phoneB) {
        score += 40;
        reasons.push("Gleiche Telefonnummer");
      }

      // 3. Name similarity
      const nameSim = similarity(a.name, b.name);
      if (nameSim >= 0.9) {
        score += 35;
        reasons.push("Sehr ähnlicher Name");
      } else if (nameSim >= 0.75) {
        score += 20;
        reasons.push("Ähnlicher Name");
      }

      // 4. Same PLZ + City combo
      if (a.plz && b.plz && a.plz === b.plz) {
        score += 10;
        if (normalize(a.city) === normalize(b.city)) {
          score += 5;
          reasons.push("Gleiche PLZ & Ort");
        }
      }

      // Only report if confidence >= 50
      if (score >= 50 && reasons.length > 0) {
        duplicates.push({
          leadId1: a.id,
          leadId2: b.id,
          confidence: Math.min(score, 100),
          reason: reasons.join(", "),
        });
      }
    }
  }

  // Sort by confidence descending, limit to top 20
  return duplicates.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leads } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length < 2) {
      return new Response(JSON.stringify({ duplicates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const duplicates = detectDuplicates(leads);

    return new Response(JSON.stringify({ duplicates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-duplicates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
