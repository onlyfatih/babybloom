import { localDate } from '@/domain/dates/local-date';
import { decideSave, mediaToDelete, validateMemoryDraft, MAX_PHOTOS_PER_MEMORY } from '@/domain/memories/memory-rules';

const today = localDate('2026-11-27');

describe('memory draft validation', () => {
  const base = { title: '', body: '', eventDate: today, photoCount: 0 };
  it('requires text or a photo', () => {
    expect(validateMemoryDraft(base, today)).toEqual(['empty']);
    expect(validateMemoryDraft({ ...base, photoCount: 1 }, today)).toEqual([]);
    expect(validateMemoryDraft({ ...base, body: 'İlk gülümseme' }, today)).toEqual([]);
  });
  it('requires an event date that is not in the future', () => {
    expect(validateMemoryDraft({ ...base, body: 'x', eventDate: null }, today)).toContain('event-date-required');
    expect(validateMemoryDraft({ ...base, body: 'x', eventDate: localDate('2026-11-28') }, today)).toContain('event-date-in-future');
  });
  it('enforces the photo limit', () => {
    expect(validateMemoryDraft({ ...base, photoCount: MAX_PHOTOS_PER_MEMORY + 1 }, today)).toContain('too-many-photos');
  });
});

describe('two-stage save decision', () => {
  it('finalizes when every upload succeeded (or there were no photos)', () => {
    expect(decideSave([])).toEqual({ kind: 'finalize', mediaIds: [] });
    expect(decideSave([{ localId: 'a', status: 'uploaded', mediaId: 'm1' }])).toEqual({ kind: 'finalize', mediaIds: ['m1'] });
  });
  it('interrupted upload: partial success needs an explicit choice', () => {
    expect(
      decideSave([
        { localId: 'a', status: 'uploaded', mediaId: 'm1' },
        { localId: 'b', status: 'failed' },
      ]),
    ).toEqual({ kind: 'needs-choice', uploadedMediaIds: ['m1'], failedLocalIds: ['b'] });
  });
  it('never reports saved when all photo uploads failed', () => {
    expect(decideSave([{ localId: 'a', status: 'failed' }])).toEqual({ kind: 'not-saved', failedLocalIds: ['a'] });
  });
  it('detached media are scheduled for deletion', () => {
    expect(mediaToDelete(['m1', 'm2', 'm3'], ['m2'])).toEqual(['m1', 'm3']);
  });
});
