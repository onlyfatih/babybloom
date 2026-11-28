/**
 * Media resolution (R3). Sources are fetched asynchronously, cached per
 * (user, family) scope (SessionProvider gives every scope its own cache, so a
 * URL issued to one user is never shown to another), and refreshed shortly
 * before they expire. A failed image load (expired or revoked early) refetches
 * once; a second failure shows the "not available" state.
 */
import { useQueries, useQuery, type Query } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { MediaSource } from '@/data/repositories/types';

/** Refresh this long before a signed URL expires. */
export const REFRESH_MARGIN_MS = 60_000;

export function msUntilRefresh(source: MediaSource | null | undefined, now: number): number | false {
  if (!source?.expiresAt) return false;
  return Math.max(5_000, source.expiresAt - REFRESH_MARGIN_MS - now);
}

const options = (resolve: (id: string) => Promise<MediaSource | null>, mediaId: string | null | undefined) => ({
  queryKey: queryKeys.media(mediaId ?? '-'),
  enabled: !!mediaId,
  queryFn: () => resolve(mediaId!),
  staleTime: (q: Query<MediaSource | null>) => {
    const ms = msUntilRefresh(q.state.data, Date.now());
    return ms === false ? Infinity : ms;
  },
  refetchInterval: (q: Query<MediaSource | null>) => msUntilRefresh(q.state.data, Date.now()),
  refetchIntervalInBackground: false,
});

export type MediaState = { status: 'none' | 'loading' | 'missing' | 'error'; source: null; onLoadError: () => void } | { status: 'ready'; source: string | number; onLoadError: () => void };

function toState(mediaId: string | null | undefined, q: { data: MediaSource | null | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }): MediaState {
  const onLoadError = () => void q.refetch();
  if (!mediaId) return { status: 'none', source: null, onLoadError };
  if (q.data) return { status: 'ready', source: q.data.uri, onLoadError };
  if (q.isError) return { status: 'error', source: null, onLoadError };
  if (q.isPending) return { status: 'loading', source: null, onLoadError };
  return { status: 'missing', source: null, onLoadError };
}

export function useMediaSource(mediaId: string | null | undefined): MediaState {
  const backend = useBackend();
  const q = useQuery(options((id) => backend.memories.resolveMedia(id), mediaId));
  return toState(mediaId, q);
}

export function useMediaSources(mediaIds: string[]): MediaState[] {
  const backend = useBackend();
  const qs = useQueries({ queries: mediaIds.map((id) => options((x) => backend.memories.resolveMedia(x), id)) });
  return qs.map((q, i) => toState(mediaIds[i], q));
}
