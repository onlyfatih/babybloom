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

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BackendProvider } from '@/data/backend';
import type { Backend } from '@/data/repositories/types';
import { FAILURE_WINDOW_MS, MAX_LOAD_RETRIES, recordLoadFailure, useMediaSource } from '@/features/media';

describe('bounded retry after an image fails to load (R3 review)', () => {
  it('allows MAX_LOAD_RETRIES new URLs, then gives up', () => {
    let failures: number[] = [];
    const answers: boolean[] = [];
    for (let i = 0; i < MAX_LOAD_RETRIES + 2; i++) {
      const r = recordLoadFailure(failures, 1_000 + i);
      failures = r.failures;
      answers.push(r.retry);
    }
    expect(answers).toEqual([true, true, false, false]);
  });
  it('failures older than the window do not count', () => {
    const old = [0, 1];
    expect(recordLoadFailure(old, FAILURE_WINDOW_MS + 10).retry).toBe(true);
  });

  it('a photo that never loads stops refetching and stays in the error state', async () => {
    let calls = 0;
    const backend = {
      memories: { resolveMedia: async () => ({ uri: `https://media.example.test/x?n=${++calls}`, expiresAt: Date.now() + 600_000 }) },
    } as unknown as Backend;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BackendProvider backend={backend}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </BackendProvider>
    );
    const { result, unmount } = await renderHook(() => useMediaSource('m1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    // The image element reports a failure every time it gets a URL.
    for (let i = 0; i < 10; i++) {
      await act(async () => result.current.onLoadError());
      await waitFor(() => expect(result.current.status).not.toBe('loading'));
    }
    await waitFor(() => expect(result.current).toMatchObject({ status: 'error', source: null }));
    expect(calls).toBe(1 + MAX_LOAD_RETRIES);
    await unmount();
    qc.clear();
  });
});
