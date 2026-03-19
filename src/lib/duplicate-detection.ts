// Client-side duplicate detection — no edge function needed

function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(p: string): string {
  return (p || "").replace(/[\s\-.\(\)]/g, "");
}

interface LeadForScan {
  id: string;
  name: string;
  email: string;
  phone: string;
  plz: string;
  city: string;
  position: string;
}

export interface DuplicatePair {
  leadId1: string;
  leadId2: string;
  confidence: number;
  reason: string;
}

export function detectDuplicates(leads: LeadForScan[]): DuplicatePair[] {
  const duplicates: DuplicatePair[] = [];

  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i];
      const b = leads[j];
      let score = 0;
      const reasons: string[] = [];

      // 1. Email match
      const emailA = normalize(a.email);
      const emailB = normalize(b.email);
      if (emailA && emailB && emailA === emailB) {
        score += 50;
        reasons.push("Gleiche E-Mail-Adresse");
      } else if (emailA && emailB) {
        // Simple check: same local part or same domain+similar local
        const [localA, domainA] = emailA.split("@");
        const [localB, domainB] = emailB.split("@");
        if (domainA === domainB && localA && localB) {
          const shorter = localA.length <= localB.length ? localA : localB;
          const longer = localA.length > localB.length ? localA : localB;
          if (longer.includes(shorter) && shorter.length >= 3) {
            score += 30;
            reasons.push("Ähnliche E-Mail-Adresse");
          }
        }
      }

      // 2. Phone match
      const phoneA = normalizePhone(a.phone);
      const phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB && phoneA.length >= 8 && phoneA === phoneB) {
        score += 40;
        reasons.push("Gleiche Telefonnummer");
      }

      // 3. Name similarity (token-based, no Levenshtein)
      const nameTokensA = normalize(a.name).split(" ").filter(Boolean);
      const nameTokensB = normalize(b.name).split(" ").filter(Boolean);
      if (nameTokensA.length > 0 && nameTokensB.length > 0) {
        const shared = nameTokensA.filter(t => nameTokensB.includes(t));
        const total = Math.max(nameTokensA.length, nameTokensB.length);
        const ratio = shared.length / total;
        if (ratio === 1 && normalize(a.name) === normalize(b.name)) {
          score += 35;
          reasons.push("Gleicher Name");
        } else if (ratio >= 0.5 && shared.length >= 1) {
          score += 20;
          reasons.push("Ähnlicher Name");
        }
      }

      // 4. Same PLZ + City
      if (a.plz && b.plz && a.plz === b.plz) {
        score += 10;
        if (normalize(a.city) === normalize(b.city)) {
          score += 5;
          reasons.push("Gleiche PLZ & Ort");
        }
      }

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

  return duplicates.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}
