// Central rule for bulk exports of lead/candidate data.
// Only superadmins may export leads (CSV export in the leads list, analytics CSV/PDF export).
// Per-candidate document downloads (Insights R4, personnel PDF/CSV for HR) are
// handled separately and are not covered by this rule.
export type LeadExportRole =
  | 'superadmin' | 'admin' | 'backoffice' | 'analyst' | 'teamleiter'
  | 'controlling' | 'geschaeftsleitung' | 'hr' | 'agency_manager';

export function canExportLeads(role: LeadExportRole | string | null | undefined): boolean {
  return role === 'superadmin';
}
