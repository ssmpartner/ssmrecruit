// Shared duplicate detection for edge functions
// Returns the matched lead if a potential duplicate is found

export interface DuplicateResult {
  isDuplicate: boolean;
  matchedLeadId?: string;
  matchedLeadName?: string;
  confidence?: number;
  reason?: string;
}

function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(p: string): string {
  return (p || "").replace(/[\s\-\.\(\)]/g, "");
}

export async function checkForDuplicate(
  supabase: any,
  name: string,
  email: string,
  phone: string
): Promise<DuplicateResult> {
  const normalizedEmail = normalize(email);
  const normalizedPhone = normalizePhone(phone);
  const normalizedName = normalize(name);

  if (!normalizedEmail && !normalizedPhone && !normalizedName) {
    return { isDuplicate: false };
  }

  // Check by email first (strongest signal)
  if (normalizedEmail) {
    const { data: emailMatch } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .ilike('email', normalizedEmail)
      .eq('lead_lifecycle', 'active')
      .limit(1)
      .single();

    if (emailMatch) {
      return {
        isDuplicate: true,
        matchedLeadId: emailMatch.id,
        matchedLeadName: emailMatch.name,
        confidence: 90,
        reason: 'Gleiche E-Mail-Adresse',
      };
    }
  }

  // Check by phone (strong signal)
  if (normalizedPhone && normalizedPhone.length >= 8) {
    const { data: phoneMatches } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .eq('lead_lifecycle', 'active')
      .limit(50);

    if (phoneMatches) {
      for (const lead of phoneMatches) {
        const leadPhone = normalizePhone(lead.phone || '');
        if (leadPhone.length >= 8 && leadPhone === normalizedPhone) {
          let score = 40;
          const reasons = ['Gleiche Telefonnummer'];

          // Boost if name also matches
          const leadName = normalize(lead.name || '');
          if (leadName && normalizedName && leadName === normalizedName) {
            score += 35;
            reasons.push('Gleicher Name');
          } else if (leadName && normalizedName && (leadName.includes(normalizedName) || normalizedName.includes(leadName))) {
            score += 20;
            reasons.push('Ähnlicher Name');
          }

          if (score >= 50) {
            return {
              isDuplicate: true,
              matchedLeadId: lead.id,
              matchedLeadName: lead.name,
              confidence: Math.min(score, 100),
              reason: reasons.join(', '),
            };
          }
        }
      }
    }
  }

  // Check by exact name match (weaker, only if combined with other signals)
  if (normalizedName && normalizedName.split(' ').length >= 2) {
    const { data: nameMatches } = await supabase
      .from('leads')
      .select('id, name, email, phone, plz')
      .ilike('name', normalizedName)
      .eq('lead_lifecycle', 'active')
      .limit(5);

    if (nameMatches && nameMatches.length > 0) {
      // Exact name match alone is not enough - needs at least phone partial or same PLZ
      // But flag it as potential duplicate for review
      return {
        isDuplicate: true,
        matchedLeadId: nameMatches[0].id,
        matchedLeadName: nameMatches[0].name,
        confidence: 60,
        reason: 'Gleicher Name',
      };
    }
  }

  return { isDuplicate: false };
}

export async function getHauptsitzAssignment(supabase: any): Promise<{ agencyId: string; employeeId: string }> {
  // Get Hauptsitz agency
  const { data: hauptsitz } = await supabase
    .from('agencies')
    .select('id')
    .ilike('name', '%hauptsitz%')
    .limit(1)
    .single();

  const agencyId = hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
  if (!agencyId) throw new Error('Keine Agentur gefunden');

  // Get first employee in Hauptsitz
  const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: agencyId });
  const employeeId = empId || (await supabase.from('employees').select('id').limit(1).single()).data?.id;
  if (!employeeId) throw new Error('Kein Mitarbeiter gefunden');

  return { agencyId, employeeId };
}
