// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { countUnprocessedLeads } from '@/lib/lead-stats';

describe('countUnprocessedLeads', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  it('counts only status new, excludes demo, flags >7 days', () => {
    const r = countUnprocessedLeads([
      { status: 'new', createdAt: '2026-11-25T00:00:00Z' },
      { status: 'new', createdAt: '2026-11-01T00:00:00Z' },
      { status: 'new', createdAt: '2026-10-01T00:00:00Z', isDemo: true },
      { status: 'contacted', createdAt: '2026-10-01T00:00:00Z' },
    ], now);
    expect(r).toEqual({ total: 2, olderThan7Days: 1 });
  });
});
