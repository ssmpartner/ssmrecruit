// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isReviewRouteAllowed, isPathAllowed } from '@/lib/route-access';

describe('review role routing', () => {
  it('hr may open settings sub-pages and contracts', () => {
    expect(isReviewRouteAllowed('hr', '/settings/profile')).toBe(true);
    expect(isReviewRouteAllowed('hr', '/contracts')).toBe(true);
  });
  it('controlling may not open contracts', () => {
    expect(isReviewRouteAllowed('controlling', '/contracts')).toBe(false);
  });
  it("'/' allows only exactly '/'", () => {
    expect(isPathAllowed(['/'], '/')).toBe(true);
    expect(isPathAllowed(['/'], '/agencies')).toBe(false);
    expect(isReviewRouteAllowed('geschaeftsleitung', '/agencies')).toBe(false);
  });
  it('prefix must end at a path boundary', () => {
    expect(isPathAllowed(['/leads'], '/leadsx')).toBe(false);
  });
  it('roles without restriction are allowed', () => {
    expect(isReviewRouteAllowed('admin', '/agencies')).toBe(true);
  });
});
