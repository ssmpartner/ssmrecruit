import { lookupPlz } from './swiss-plz';
import type { Agency, Employee } from './mock-data';

/**
 * Resolve agency and employee based on PLZ/canton code.
 * Prefers specific agencies over Hauptsitz (fallback).
 */
export function resolveAssignmentByPlz(
  plz: string,
  cantonCode: string | undefined,
  agencies: Agency[],
  employees: Employee[],
  fallbackAgencyId: string,
  fallbackEmployeeId: string,
): { agencyId: string; employeeId: string } {
  // Determine canton code from PLZ if not provided
  let resolvedCanton = cantonCode;
  if (!resolvedCanton && plz) {
    const loc = lookupPlz(plz);
    if (loc) resolvedCanton = loc.cantonCode;
  }

  if (!resolvedCanton) {
    return { agencyId: fallbackAgencyId, employeeId: fallbackEmployeeId };
  }

  // Find specific agency (not Hauptsitz) with this canton
  const specificAgency = agencies
    .filter(a => !a.name.toLowerCase().includes('hauptsitz'))
    .filter(a => (a as any).allowedCantons?.includes(resolvedCanton))
    .sort((a, b) => ((a as any).allowedCantons?.length || 99) - ((b as any).allowedCantons?.length || 99))[0];

  const matchedAgencyId = specificAgency?.id || fallbackAgencyId;

  // Find employee from that agency
  const agencyEmployees = employees.filter(e => e.agencyId === matchedAgencyId);
  const matchedEmployeeId = agencyEmployees[0]?.id || fallbackEmployeeId;

  return { agencyId: matchedAgencyId, employeeId: matchedEmployeeId };
}
