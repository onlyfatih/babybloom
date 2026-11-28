import { QueryClient } from '@tanstack/react-query';
import { DataError } from '@/data/repositories/types';

const FINAL = ['forbidden', 'not-found', 'membership-revoked', 'session-expired', 'validation'];

/** One client per (user, family) scope; see SessionProvider. Writes are never retried blindly. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !(error instanceof DataError && FINAL.includes(error.code)) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}
