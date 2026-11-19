// Per-role module visibility overrides (stored in app_settings key "role_modules").
// Shape: { [role]: { [modulePath]: boolean } } — missing entry = default behaviour.
export type RoleModuleOverrides = Record<string, Record<string, boolean>>;

export const ROLE_MODULES_SETTING_KEY = 'role_modules';

export const CONFIGURABLE_MODULES: { path: string; label: string; roles: string[] | null; excludeRoles: string[] }[] = [
  { path: '/leads', label: 'Leads / Kandidaten', roles: null, excludeRoles: [] },
  { path: '/tasks', label: 'Aufgaben', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] },
  { path: '/calendar', label: 'Kalender', roles: null, excludeRoles: ['hr'] },
  { path: '/agencies', label: 'Agenturen', roles: ['superadmin', 'admin', 'analyst'], excludeRoles: [] },
  { path: '/employees', label: 'Mitarbeiter', roles: ['superadmin', 'admin', 'analyst'], excludeRoles: [] },
  { path: '/analytics', label: 'Statistik', roles: null, excludeRoles: ['hr'] },
  { path: '/contracts', label: 'Verträge', roles: ['superadmin'], excludeRoles: [] },
  { path: '/processes', label: 'Prozesse', roles: ['superadmin', 'admin', 'analyst'], excludeRoles: [] },
  { path: '/api-docs', label: 'API-Dokumentation', roles: ['superadmin', 'admin'], excludeRoles: [] },
  { path: '/documentation', label: 'Dokumentation', roles: ['superadmin', 'admin', 'analyst'], excludeRoles: [] },
  { path: '/feedback', label: 'Feedback', roles: null, excludeRoles: [] },
  { path: '/help', label: 'Hilfe-Center', roles: null, excludeRoles: [] },
];

/** Roles that can be configured (superadmin always keeps full access). */
export const CONFIGURABLE_ROLES: { role: string; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'backoffice', label: 'Backoffice' },
  { role: 'analyst', label: 'Analyst' },
  { role: 'teamleiter', label: 'Teamleiter' },
  { role: 'agency_manager', label: 'Agenturleiter' },
  { role: 'controlling', label: 'Controlling' },
  { role: 'geschaeftsleitung', label: 'Geschäftsleitung' },
  { role: 'hr', label: 'HR' },
];

export function defaultModuleAccess(path: string, role: string): boolean {
  const m = CONFIGURABLE_MODULES.find(x => x.path === path);
  if (!m) return true;
  if (m.roles && !m.roles.includes(role)) return false;
  if (m.excludeRoles.includes(role)) return false;
  return true;
}

function findModule(pathname: string) {
  return CONFIGURABLE_MODULES.find(m => pathname === m.path || pathname.startsWith(m.path + '/'));
}

/** Override for a pathname: true = force allow, false = force hide, undefined = default rules. */
export function getModuleOverride(overrides: RoleModuleOverrides | undefined, role: string | null, pathname: string): boolean | undefined {
  if (!role || role === 'superadmin' || !overrides) return undefined;
  const m = findModule(pathname);
  if (!m) return undefined;
  return overrides[role]?.[m.path];
}

export function resolveModuleAccess(overrides: RoleModuleOverrides | undefined, role: string | null, path: string, baseAllowed: boolean): boolean {
  const o = getModuleOverride(overrides, role, path);
  return o === undefined ? baseAllowed : o;
}
