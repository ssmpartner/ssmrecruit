import { lookupPlz } from './swiss-plz';
import type { Agency, Employee } from './mock-data';

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolve agency and employee based on PLZ/canton code.
 * Priority: 1) Canton match  2) Radius + nearest distance as tiebreaker/fallback
 */
export function resolveAssignmentByPlz(
  plz: string,
  cantonCode: string | undefined,
  agencies: Agency[],
  employees: Employee[],
  fallbackAgencyId: string,
  fallbackEmployeeId: string,
  leadLat?: number | null,
  leadLng?: number | null,
  currentMonthLeadCounts?: Record<string, number>,
  currentMonthEmployeeLeadCounts?: Record<string, number>,
): { agencyId: string; employeeId: string } {
  let resolvedCanton = cantonCode;
  if (!resolvedCanton && plz) {
    const loc = lookupPlz(plz);
    if (loc) resolvedCanton = loc.cantonCode;
  }

  const isWithinQuota = (a: Agency) => {
    if (a.monthlyLeadQuota === null || a.monthlyLeadQuota === undefined) return true;
    const count = currentMonthLeadCounts?.[a.id] ?? 0;
    return count < a.monthlyLeadQuota;
  };

  const nonHq = agencies.filter(a => !a.name.toLowerCase().includes('hauptsitz') && isWithinQuota(a));

  // Step 1: Canton-based matching
  if (resolvedCanton) {
    const cantonMatches = nonHq
      .filter(a => a.allowedCantons?.includes(resolvedCanton!))
      .sort((a, b) => (a.allowedCantons?.length || 99) - (b.allowedCantons?.length || 99));

    if (cantonMatches.length === 1) {
      return pickEmployee(cantonMatches[0].id, employees, fallbackEmployeeId, currentMonthEmployeeLeadCounts);
    }

    // Multiple canton matches → use distance as tiebreaker if coordinates available
    if (cantonMatches.length > 1 && leadLat != null && leadLng != null) {
      const withCoords = cantonMatches.filter(a => a.latitude != null && a.longitude != null);
      if (withCoords.length > 0) {
        const nearest = withCoords
          .map(a => ({ agency: a, dist: haversineKm(leadLat, leadLng, a.latitude!, a.longitude!) }))
          .sort((a, b) => a.dist - b.dist)[0];
        return pickEmployee(nearest.agency.id, employees, fallbackEmployeeId, currentMonthEmployeeLeadCounts);
      }
      return pickEmployee(cantonMatches[0].id, employees, fallbackEmployeeId, currentMonthEmployeeLeadCounts);
    }

    if (cantonMatches.length > 0) {
      return pickEmployee(cantonMatches[0].id, employees, fallbackEmployeeId, currentMonthEmployeeLeadCounts);
    }
  }

  // Step 2: Radius-based fallback (no canton match)
  if (leadLat != null && leadLng != null) {
    const withinRadius = nonHq
      .filter(a => a.latitude != null && a.longitude != null)
      .map(a => ({ agency: a, dist: haversineKm(leadLat, leadLng, a.latitude!, a.longitude!) }))
      .filter(a => a.dist <= (a.agency.radiusKm ?? 30))
      .sort((a, b) => a.dist - b.dist);

    if (withinRadius.length > 0) {
      return pickEmployee(withinRadius[0].agency.id, employees, fallbackEmployeeId, currentMonthEmployeeLeadCounts);
    }
  }

  // Final fallback: Hauptsitz
  return { agencyId: fallbackAgencyId, employeeId: fallbackEmployeeId };
}

function pickEmployee(
  agencyId: string,
  employees: Employee[],
  fallbackEmployeeId: string,
  employeeLeadCounts?: Record<string, number>,
): { agencyId: string; employeeId: string } {
  // Backoffice, Geschäftsleitung, Controlling und HR erhalten KEINE automatischen Lead-Zuweisungen
  const EXCLUDED_ROLES = ['backoffice', 'geschaeftsleitung', 'controlling', 'hr'];
  const agencyEmployees = employees.filter(
    e => e.agencyId === agencyId && !EXCLUDED_ROLES.includes((e as any).role)
  );
  if (agencyEmployees.length === 0) {
    return { agencyId, employeeId: fallbackEmployeeId };
  }
  if (agencyEmployees.length === 1 || !employeeLeadCounts) {
    return { agencyId, employeeId: agencyEmployees[0].id };
  }
  // Fair distribution: pick employee with fewest leads this month
  const sorted = [...agencyEmployees].sort(
    (a, b) => (employeeLeadCounts[a.id] ?? 0) - (employeeLeadCounts[b.id] ?? 0)
  );
  return { agencyId, employeeId: sorted[0].id };
}
