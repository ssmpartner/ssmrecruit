/**
 * Liefert einen anzeigbaren Namen, der niemals eine E-Mail-Adresse zeigt.
 * - Wenn display_name vorhanden ist und KEIN '@' enthält → display_name
 * - Wenn display_name eine E-Mail ist oder fehlt → Local-Part der E-Mail
 *   wird in einen lesbaren Namen umgewandelt
 *   ("bilel.chagra" → "Bilel Chagra", "max_mueller" → "Max Mueller")
 * - Fallback: "Benutzer"
 */
export function prettifyEmailLocal(emailLocal: string): string {
  return emailLocal
    .split(/[._\-+]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function resolveDisplayName(
  displayName?: string | null,
  email?: string | null,
  fallback = 'Benutzer'
): string {
  if (displayName && !displayName.includes('@') && displayName.trim().length > 0) {
    return displayName.trim();
  }
  const source = (displayName && displayName.includes('@') ? displayName : email) || '';
  if (source.includes('@')) {
    const local = source.split('@')[0];
    const pretty = prettifyEmailLocal(local);
    if (pretty) return pretty;
  }
  return fallback;
}

export function resolveFirstName(
  displayName?: string | null,
  email?: string | null,
  fallback = 'Benutzer'
): string {
  return resolveDisplayName(displayName, email, fallback).split(' ')[0];
}
