/**
 * Maps Supabase / PostgREST / RPC errors to DataError codes. RPCs raise stable
 * codes as their message (backend/supabase/migrations/*_rpc.sql).
 */
import { DataError, type DataErrorCode } from '../../repositories/types';

const RPC_CODES: Record<string, DataErrorCode> = {
  'session-expired': 'session-expired',
  forbidden: 'forbidden',
  'membership-revoked': 'membership-revoked',
  'not-found': 'not-found',
  'invalid-invitation': 'invalid-invitation',
  'upload-failed': 'upload-failed',
  validation: 'validation',
  conflict: 'validation',
  'last-owner': 'validation',
  'already-born': 'validation',
  'rate-limited': 'validation',
};

export interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

export function toDataError(e: unknown): DataError {
  if (e instanceof DataError) return e;
  const err = (e ?? {}) as SupabaseLikeError;
  const msg = err.message ?? '';
  if (RPC_CODES[msg]) return new DataError(RPC_CODES[msg]!, msg);
  if (err.status === 401 || err.code === 'PGRST301' || /JWT expired|invalid JWT/i.test(msg)) return new DataError('session-expired', msg);
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) return new DataError('forbidden', msg);
  if (err.code === '23503' || err.code === '23514' || err.code === '23505' || err.code === '22P02') return new DataError('validation', msg);
  if (/Failed to fetch|Network request failed|fetch failed|NetworkError/i.test(msg) || err.name === 'AuthRetryableFetchError') return new DataError('offline', msg);
  return new DataError('unknown', msg || 'unknown');
}

/** Unwraps `{ data, error }`, throwing a DataError. */
export async function unwrap<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await p;
  } catch (e) {
    throw toDataError(e);
  }
  if (res.error) throw toDataError(res.error);
  return res.data;
}

/** Like unwrap, for calls that must return data; null data is an error. */
export async function unwrapData<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const data = await unwrap(p);
  if (data === null || data === undefined) throw new DataError('unknown', 'empty-response');
  return data as NonNullable<T>;
}
