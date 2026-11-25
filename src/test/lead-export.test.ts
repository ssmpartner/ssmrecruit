// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { canExportLeads } from '@/lib/lead-export';

describe('lead export permission', () => {
  it('superadmin may export leads', () => {
    expect(canExportLeads('superadmin')).toBe(true);
  });

  it('admin may not export leads', () => {
    expect(canExportLeads('admin')).toBe(false);
  });

  it('every other role and no role may not export leads', () => {
    const roles = [
      'backoffice', 'analyst', 'teamleiter', 'agency_manager',
      'controlling', 'geschaeftsleitung', 'hr',
    ] as const;
    for (const role of roles) expect(canExportLeads(role)).toBe(false);
    expect(canExportLeads(null)).toBe(false);
    expect(canExportLeads(undefined)).toBe(false);
  });
});
