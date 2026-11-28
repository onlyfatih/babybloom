/**
 * Media resolution (R3). Sources are fetched asynchronously, cached per
 * (user, family) scope (SessionProvider gives every scope its own cache, so a
 * URL issued to one user is never shown to another), and refreshed shortly
 * before they expire.
 *
 * A failed image load (URL expired or revoked early, broken file) asks for a
 * new URL at most MAX_LOAD_RETRIES times within FAILURE_WINDOW_MS. After that
 * the item stays in the 'error' state (placeholder) and is not refetched,
 * not even by the expiry timer, until the scope's cache forgets the failures.
 */
import { useQueries, useQuery, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { MediaSource } from '@/data/repositories/types';

/** Refresh this long before a signed URL expires. */
export const REFRESH_MARGIN_MS = 60_000;

export function msUntilRefresh(source: MediaSource | null | undefined, now: number): number | false {
  if (!source?.expiresAt) return false;
  return Math.max(5_000, source.expiresAt - REFRESH_MARGIN_MS - now);
}

export const MAX_LOAD_RETRIES = 2;
export const FAILURE_WINDOW_MS = 10 * 60_000;

/** Adds a load failure at `now`; `retry` says whether another URL may be requested. */
export function recordLoadFailure(previous: readonly number[], now: number): { failures: number[]; retry: boolean } {
  const failures = [...previous.filter((at) => now - at < FAILURE_WINDOW_MS), now];
  return { failures, retry: failures.length <= MAX_LOAD_RETRIES };
}

export const hasGivenUp = (failures: readonly number[] | undefined) => (failures?.length ?? 0) > MAX_LOAD_RETRIES;

const failureOptions = (mediaId: string | null | undefined) => ({
  queryKey: queryKeys.mediaLoadFailures(mediaId ?? '-'),
  queryFn: () => [] as number[],
  initialData: [] as number[],
  enabled: false,
  staleTime: Infinity,
});

function loadErrorHandler(qc: QueryClient, mediaId: string | null | undefined, refetch: () => unknown) {
  return () => {
    if (!mediaId) return;
    const key = queryKeys.mediaLoadFailures(mediaId);
    const { failures, retry } = recordLoadFailure(qc.getQueryData<number[]>(key) ?? [], Date.now());
    qc.setQueryData(key, failures);
    if (retry) void refetch();
  };
}

const options = (resolve: (id: string) => Promise<MediaSource | null>, mediaId: string | null | undefined, gaveUp: boolean) => ({
  queryKey: queryKeys.media(mediaId ?? '-'),
  enabled: !!mediaId && !gaveUp,
  queryFn: () => resolve(mediaId!),
  staleTime: (q: Query<MediaSource | null>) => {
    const ms = msUntilRefresh(q.state.data, Date.now());
    return ms === false ? Infinity : ms;
  },
  refetchInterval: (q: Query<MediaSource | null>) => msUntilRefresh(q.state.data, Date.now()),
  refetchIntervalInBackground: false,
});

export type MediaState = { status: 'none' | 'loading' | 'missing' | 'error'; source: null; onLoadError: () => void } | { status: 'ready'; source: string | number; onLoadError: () => void };

function toState(mediaId: string | null | undefined, q: { data: MediaSource | null | undefined; isPending: boolean; isError: boolean }, gaveUp: boolean, onLoadError: () => void): MediaState {
  if (!mediaId) return { status: 'none', source: null, onLoadError };
  if (gaveUp) return { status: 'error', source: null, onLoadError };
  if (q.data) return { status: 'ready', source: q.data.uri, onLoadError };
  if (q.isError) return { status: 'error', source: null, onLoadError };
  if (q.isPending) return { status: 'loading', source: null, onLoadError };
  return { status: 'missing', source: null, onLoadError };
}

export function useMediaSource(mediaId: string | null | undefined): MediaState {
  const backend = useBackend();
  const qc = useQueryClient();
  const gaveUp = hasGivenUp(useQuery(failureOptions(mediaId)).data);
  const q = useQuery(options((id) => backend.memories.resolveMedia(id), mediaId, gaveUp));
  return toState(mediaId, q, gaveUp, loadErrorHandler(qc, mediaId, q.refetch));
}

export function useMediaSources(mediaIds: string[]): MediaState[] {
  const backend = useBackend();
  const qc = useQueryClient();
  const failures = useQueries({ queries: mediaIds.map((id) => failureOptions(id)) });
  const gaveUp = failures.map((f) => hasGivenUp(f.data));
  const qs = useQueries({ queries: mediaIds.map((id, i) => options((x) => backend.memories.resolveMedia(x), id, gaveUp[i])) });
  return qs.map((q, i) => toState(mediaIds[i], q, gaveUp[i], loadErrorHandler(qc, mediaIds[i], q.refetch)));
}
