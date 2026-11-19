// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveModuleAccess, defaultModuleAccess } from '@/lib/role-modules';

describe('role modules', () => {
  it('hidden module is blocked for that role, also on sub-paths', () => {
    expect(resolveModuleAccess({ admin: { '/agencies': false } }, 'admin', '/agencies', true)).toBe(false);
    expect(resolveModuleAccess({ admin: { '/leads': false } }, 'admin', '/leads/123', true)).toBe(false);
  });
  it('module can be granted beyond default', () => {
    expect(defaultModuleAccess('/agencies', 'teamleiter')).toBe(false);
    expect(resolveModuleAccess({ teamleiter: { '/agencies': true } }, 'teamleiter', '/agencies', false)).toBe(true);
  });
  it('superadmin is never restricted', () => {
    expect(resolveModuleAccess({ superadmin: { '/leads': false } }, 'superadmin', '/leads', true)).toBe(true);
  });
});
