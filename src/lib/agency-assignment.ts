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
  let resolvedCanton = cantonCode;
  if (!resolvedCanton && plz) {
    const loc = lookupPlz(plz);
    if (loc) resolvedCanton = loc.cantonCode;
  }

  if (!resolvedCanton) {
    return { agencyId: fallbackAgencyId, employeeId: fallbackEmployeeId };
  }

  // Find specific agency (not Hauptsitz) with this canton, prefer most specific
  const specificAgency = agencies
    .filter(a => !a.name.toLowerCase().includes('hauptsitz'))
    .filter(a => a.allowedCantons?.includes(resolvedCanton!))
    .sort((a, b) => (a.allowedCantons?.length || 99) - (b.allowedCantons?.length || 99))[0];

  const matchedAgencyId = specificAgency?.id || fallbackAgencyId;

  // Find employee from matched agency
  const agencyEmployees = employees.filter(e => e.agencyId === matchedAgencyId);
  const matchedEmployeeId = agencyEmployees[0]?.id || fallbackEmployeeId;

  return { agencyId: matchedAgencyId, employeeId: matchedEmployeeId };
}
