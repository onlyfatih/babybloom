import {
  appointmentColumns,
  compareMemories,
  subjectColumns,
  subjectOf,
  toAppointment,
  toChild,
  toInvitation,
  toLocalTime,
  toMeasurement,
  toMemory,
  type MemoryRow,
} from '@/data/providers/supabase/mapping';
import type { LocalDate } from '@/domain/dates/local-date';
import type { LocalTime } from '@/domain/dates/zoned-date-time';

const T = '2026-11-28T08:00:00.000Z';

function memoryRow(over: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'm1',
    family_id: 'f1',
    pregnancy_id: null,
    child_id: 'c1',
    title: 'İlk gülümseme',
    body: null,
    event_date: '2026-11-20',
    visibility: 'family',
    author_id: 'u1',
    version: 3,
    client_request_id: 'r1',
    last_request_id: 'r3',
    created_at: T,
    updated_at: T,
    memory_media: [
      { media_id: 'b', position: 1 },
      { media_id: 'a', position: 0 },
    ],
    ...over,
  } as MemoryRow;
}

describe('supabase row mapping', () => {
  it('trims seconds from postgres time', () => {
    expect(toLocalTime('07:45:00')).toBe('07:45');
  });

  it('maps subjects both ways, child wins over pregnancy', () => {
    expect(subjectOf({ pregnancy_id: 'p', child_id: null })).toEqual({ kind: 'pregnancy', pregnancyId: 'p' });
    expect(subjectOf({ pregnancy_id: 'p', child_id: 'c' })).toEqual({ kind: 'child', childId: 'c' });
    expect(subjectOf({ pregnancy_id: null, child_id: null })).toBeNull();
    expect(subjectColumns({ kind: 'child', childId: 'c' })).toEqual({ pregnancy_id: null, child_id: 'c' });
    expect(subjectColumns({ kind: 'pregnancy', pregnancyId: 'p' })).toEqual({ pregnancy_id: 'p', child_id: null });
    expect(subjectColumns(null)).toEqual({ pregnancy_id: null, child_id: null });
  });

  it('maps a memory with media in position order and its version', () => {
    const m = toMemory(memoryRow());
    expect(m.mediaIds).toEqual(['a', 'b']);
    expect(m.version).toBe(3);
    expect(m.subject).toEqual({ kind: 'child', childId: 'c1' });
    expect(m.eventDate).toBe('2026-11-20');
  });

  it('refuses a memory without subject', () => {
    expect(() => toMemory(memoryRow({ child_id: null }))).toThrow(/no subject/);
  });

  it('orders memories deterministically: event date, created, id', () => {
    const a = toMemory(memoryRow({ id: 'a', event_date: '2026-11-20' }));
    const b = toMemory(memoryRow({ id: 'b', event_date: '2026-11-21' }));
    const c = toMemory(memoryRow({ id: 'c', event_date: '2026-11-20' }));
    const d = toMemory(memoryRow({ id: 'd', event_date: '2026-11-20', created_at: '2026-11-28T09:00:00.000Z' }));
    expect([a, b, c, d].sort(compareMemories).map((m) => m.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('maps a child with optional birth time and archive flag', () => {
    const row = {
      id: 'c1', family_id: 'f1', name: 'Deniz', birth_date: '2026-10-01', birth_time: '03:10:00',
      origin_pregnancy_id: 'p1', avatar_media_id: null, archived_at: null, created_by: 'u1',
      create_request_id: null, created_at: T, updated_at: T,
    };
    const child = toChild(row as never);
    expect(child.birthTime).toBe('03:10');
    expect(child.archivedAt).toBeNull();
    expect(toChild({ ...row, birth_time: null } as never).birthTime).toBeNull();
  });

  it('maps a measurement with method, source and correction time', () => {
    const m = toMeasurement({
      id: 'g1', family_id: 'f1', child_id: 'c1', kind: 'weight', canonical_value: 3400, entered_unit: 'g',
      measured_on: '2026-10-01', is_birth_measurement: true, method: null, source: 'clinic', note: null,
      author_id: 'u1', created_at: T, updated_at: '2026-11-28T09:00:00.000Z',
    } as never);
    expect(m).toMatchObject({ canonicalValue: 3400, enteredUnit: 'g', method: null, source: 'clinic', updatedAt: '2026-11-28T09:00:00.000Z' });
  });

  it('round-trips appointment time and zone', () => {
    const input = {
      familyId: 'f1',
      subject: { kind: 'pregnancy' as const, pregnancyId: 'p1' },
      title: '  Kontrol  ',
      start: { date: '2026-12-02' as LocalDate, time: '09:30' as LocalTime, timeZone: 'Europe/Istanbul' },
      location: null,
      notes: null,
      visibility: 'private' as const,
    };
    const cols = appointmentColumns(input);
    expect(cols).toMatchObject({ title: 'Kontrol', start_time: '09:30', time_zone: 'Europe/Istanbul', pregnancy_id: 'p1', child_id: null });
    const back = toAppointment({ ...cols, id: 'a1', family_id: 'f1', start_time: '09:30:00', author_id: 'u1', created_at: T, updated_at: T } as never);
    expect(back.start).toEqual(input.start);
    expect(back.visibility).toBe('private');
  });

  it('marks pending invitations past expiry as expired and never exposes a stored code', () => {
    const row = {
      id: 'i1', family_id: 'f1', invited_by: 'u1', role: 'adult', relationship_label: 'Anneanne',
      expires_at: '2026-11-28T10:00:00.000Z', status: 'pending', accepted_by: null, accepted_at: null,
      revoked_at: null, created_at: T,
    };
    const before = Date.parse('2026-11-28T09:59:59.000Z');
    const after = Date.parse('2026-11-28T10:00:00.000Z');
    expect(toInvitation(row as never, before).status).toBe('pending');
    expect(toInvitation(row as never, after).status).toBe('expired');
    expect(toInvitation(row as never, before).code).toBe('');
    expect(toInvitation(row as never, before, 'tok').code).toBe('tok');
    expect(toInvitation({ ...row, status: 'revoked' } as never, after).status).toBe('revoked');
  });
});
