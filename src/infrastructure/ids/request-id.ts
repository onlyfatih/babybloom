import { randomUUID } from 'expo-crypto';

/** A UUID v4 used as an idempotency key (memory finalize, birth, child creation). */
export function newRequestId(): string {
  return randomUUID();
}
