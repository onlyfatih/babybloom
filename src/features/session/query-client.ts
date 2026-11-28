import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { DataError } from '@/data/repositories/types';

const FINAL = ['forbidden', 'not-found', 'membership-revoked', 'session-expired', 'validation'];
/** Errors that may mean the session or membership changed: re-resolve the session. */
const SESSION_HINTS = ['forbidden', 'membership-revoked', 'session-expired'];

export const isSessionHint = (error: unknown) => error instanceof DataError && SESSION_HINTS.includes(error.code);

/**
 * One client per (user, family) scope; see SessionProvider. Writes are never
 * retried blindly. `onSessionHint` runs when a request was refused in a way
 * that may mean revocation or expiry, so the app re-checks the session instead
 * of showing a generic error forever.
 */
export function createQueryClient(onSessionHint: () => void = () => undefined) {
  const hint = (error: unknown) => {
    if (isSessionHint(error)) onSessionHint();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: hint }),
    mutationCache: new MutationCache({ onError: hint }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !(error instanceof DataError && FINAL.includes(error.code)) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}
