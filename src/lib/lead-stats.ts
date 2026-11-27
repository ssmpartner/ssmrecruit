const DAY = 24 * 60 * 60 * 1000;

/** Leads with status "new" (demo leads excluded) and how many are older than 7 days. */
export function countUnprocessedLeads(
  leads: Array<{ status: string; createdAt: string; isDemo?: boolean }>,
  now: Date = new Date(),
): { total: number; olderThan7Days: number } {
  const cutoff = now.getTime() - 7 * DAY;
  let total = 0;
  let old = 0;
  for (const l of leads) {
    if (l.status !== 'new' || l.isDemo) continue;
    total++;
    const t = new Date(l.createdAt).getTime();
    if (!Number.isNaN(t) && t < cutoff) old++;
  }
  return { total, olderThan7Days: old };
}
