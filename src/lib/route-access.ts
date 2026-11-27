/** Review roles may only open these modules (incl. their sub-pages). */
export const REVIEW_ROLE_ALLOWED: Record<string, string[]> = {
  controlling: ['/', '/leads', '/calendar', '/analytics', '/settings', '/help', '/feedback'],
  geschaeftsleitung: ['/', '/leads', '/calendar', '/analytics', '/settings', '/help', '/feedback'],
  hr: ['/', '/leads', '/calendar', '/analytics', '/settings', '/help', '/feedback', '/contracts'],
};

/** Exact match or sub-path; '/' only matches '/' exactly. */
export function isPathAllowed(allowed: string[], pathname: string): boolean {
  return allowed.some(p => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}

/** null = role has no review restriction. */
export function isReviewRouteAllowed(role: string | null | undefined, pathname: string): boolean {
  const allowed = role ? REVIEW_ROLE_ALLOWED[role] : undefined;
  return !allowed || isPathAllowed(allowed, pathname);
}
