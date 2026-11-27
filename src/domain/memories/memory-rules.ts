/**
 * Memory validation and the two-stage save policy. See docs/architecture.md#media.
 *
 * Save flow:
 *   1. prepare: validate draft, request upload slots (pending MediaAsset rows)
 *   2. upload: upload each photo to private storage (progress, retry per photo)
 *   3. finalize: create/update the Memory row referencing only uploaded media
 *   4. cleanup: pending media not finalized within 24h are marked orphaned and deleted by a scheduled job
 *
 * A memory is never reported as saved when its requested photos all failed.
 */
import type { LocalDate } from '../dates/local-date';
import { compareLocalDates } from '../dates/local-date';

export const MAX_PHOTOS_PER_MEMORY = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // before client-side resize
export const RESIZE_LONG_EDGE_PX = 2048;
export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
export const MAX_TITLE_LENGTH = 120;
export const MAX_BODY_LENGTH = 10_000;

export interface MemoryDraft {
  title: string;
  body: string;
  eventDate: LocalDate | null;
  photoCount: number;
}

export type MemoryValidationError =
  | 'empty' // neither text nor photo
  | 'event-date-required'
  | 'event-date-in-future'
  | 'too-many-photos'
  | 'title-too-long'
  | 'body-too-long';

export function validateMemoryDraft(draft: MemoryDraft, today: LocalDate): MemoryValidationError[] {
  const errors: MemoryValidationError[] = [];
  const hasText = draft.title.trim().length > 0 || draft.body.trim().length > 0;
  if (!hasText && draft.photoCount === 0) errors.push('empty');
  if (!draft.eventDate) errors.push('event-date-required');
  else if (compareLocalDates(draft.eventDate, today) > 0) errors.push('event-date-in-future');
  if (draft.photoCount > MAX_PHOTOS_PER_MEMORY) errors.push('too-many-photos');
  if (draft.title.length > MAX_TITLE_LENGTH) errors.push('title-too-long');
  if (draft.body.length > MAX_BODY_LENGTH) errors.push('body-too-long');
  return errors;
}

export type PhotoUploadResult = { localId: string; status: 'uploaded'; mediaId: string } | { localId: string; status: 'failed' };

export type SaveDecision =
  | { kind: 'finalize'; mediaIds: string[] }
  /** Some photos failed: do not finalize silently. Ask the parent to retry or continue without them. */
  | { kind: 'needs-choice'; uploadedMediaIds: string[]; failedLocalIds: string[] }
  /** Every requested photo failed: nothing is saved, the draft stays. */
  | { kind: 'not-saved'; failedLocalIds: string[] };

export function decideSave(results: PhotoUploadResult[]): SaveDecision {
  const uploaded = results.filter((r): r is Extract<PhotoUploadResult, { status: 'uploaded' }> => r.status === 'uploaded');
  const failed = results.filter((r) => r.status === 'failed').map((r) => r.localId);
  if (failed.length === 0) return { kind: 'finalize', mediaIds: uploaded.map((u) => u.mediaId) };
  if (uploaded.length === 0) return { kind: 'not-saved', failedLocalIds: failed };
  return { kind: 'needs-choice', uploadedMediaIds: uploaded.map((u) => u.mediaId), failedLocalIds: failed };
}

/** Media that were attached before an edit and are no longer referenced must be deleted from storage. */
export function mediaToDelete(before: string[], after: string[]): string[] {
  const keep = new Set(after);
  return before.filter((id) => !keep.has(id));
}
