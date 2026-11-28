import { msUntilRefresh, REFRESH_MARGIN_MS } from '@/features/media';

describe('media source refresh timing', () => {
  const now = 1_000_000;
  it('never refreshes a local source', () => {
    expect(msUntilRefresh({ uri: 'file://x', expiresAt: null }, now)).toBe(false);
    expect(msUntilRefresh(null, now)).toBe(false);
  });
  it('refreshes a signed URL a margin before it expires', () => {
    expect(msUntilRefresh({ uri: 'https://x', expiresAt: now + 600_000 }, now)).toBe(600_000 - REFRESH_MARGIN_MS);
  });
  it('an almost-expired or expired URL refreshes soon, not in a tight loop', () => {
    expect(msUntilRefresh({ uri: 'https://x', expiresAt: now + 10_000 }, now)).toBe(5_000);
    expect(msUntilRefresh({ uri: 'https://x', expiresAt: now - 10_000 }, now)).toBe(5_000);
  });
});
