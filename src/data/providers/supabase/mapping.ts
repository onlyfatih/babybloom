/**
 * Database rows → domain types (and back). Pure functions, unit-tested in
 * __tests__/data/supabase-mapping-test.ts. Nothing outside this provider sees
 * a row type.
 */
import type { LocalDate } from '@/domain/dates/local-date';
import type { LocalTime } from '@/domain/dates/zoned-date-time';
import type { Appointment, Child, FamilyInvitation, GrowthMeasurement, MeasurementKind, Memory, Pregnancy, ProfileRef } from '@/domain/model';
import type { AppointmentInput } from '../../repositories/types';
import type { Database } from './database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

const date = (v: string) => v as LocalDate;
/** Postgres `time` comes back as HH:MM:SS; the app uses HH:MM. */
export const toLocalTime = (v: string) => v.slice(0, 5) as LocalTime;

export function subjectOf(row: { pregnancy_id: string | null; child_id: string | null }): ProfileRef | null {
  if (row.child_id) return { kind: 'child', childId: row.child_id };
  if (row.pregnancy_id) return { kind: 'pregnancy', pregnancyId: row.pregnancy_id };
  return null;
}

export function subjectColumns(ref: ProfileRef | null): { pregnancy_id: string | null; child_id: string | null } {
  if (!ref) return { pregnancy_id: null, child_id: null };
  return ref.kind === 'child' ? { pregnancy_id: null, child_id: ref.childId } : { pregnancy_id: ref.pregnancyId, child_id: null };
}

export function toPregnancy(r: Row<'pregnancies'>): Pregnancy {
  return {
    id: r.id,
    familyId: r.family_id,
    nickname: r.nickname,
    clinicianDueDate: r.clinician_due_date ? date(r.clinician_due_date) : null,
    lastMenstrualPeriod: r.last_menstrual_period ? date(r.last_menstrual_period) : null,
    status: r.status,
    remindersPaused: r.reminders_paused,
    contentHidden: r.content_hidden,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toChild(r: Row<'children'>): Child {
  return {
    id: r.id,
    familyId: r.family_id,
    name: r.name,
    birthDate: date(r.birth_date),
    birthTime: r.birth_time ? toLocalTime(r.birth_time) : null,
    originPregnancyId: r.origin_pregnancy_id,
    avatarMediaId: r.avatar_media_id,
    archivedAt: r.archived_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type MemoryRow = Row<'memories'> & { memory_media: { media_id: string; position: number }[] };

export function toMemory(r: MemoryRow): Memory {
  const subject = subjectOf(r);
  if (!subject) throw new Error(`memory ${r.id} has no subject`);
  return {
    id: r.id,
    familyId: r.family_id,
    subject,
    title: r.title,
    body: r.body,
    eventDate: date(r.event_date),
    mediaIds: [...(r.memory_media ?? [])].sort((a, b) => a.position - b.position).map((m) => m.media_id),
    visibility: r.visibility,
    authorId: r.author_id,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Timeline order: event date (newest first), then creation time, then id. Deterministic. */
export function compareMemories(a: Memory, b: Memory): number {
  return b.eventDate.localeCompare(a.eventDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

export function toMeasurement(r: Row<'growth_measurements'>): GrowthMeasurement {
  return {
    id: r.id,
    familyId: r.family_id,
    childId: r.child_id,
    kind: r.kind as MeasurementKind,
    canonicalValue: r.canonical_value,
    enteredUnit: r.entered_unit,
    measuredOn: date(r.measured_on),
    isBirthMeasurement: r.is_birth_measurement,
    method: (r.method as GrowthMeasurement['method']) ?? null,
    source: (r.source as GrowthMeasurement['source']) ?? null,
    note: r.note,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toAppointment(r: Row<'appointments'>): Appointment {
  return {
    id: r.id,
    familyId: r.family_id,
    subject: subjectOf(r),
    title: r.title,
    start: { date: date(r.start_date), time: toLocalTime(r.start_time), timeZone: r.time_zone },
    location: r.location,
    notes: r.notes,
    visibility: r.visibility,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function appointmentColumns(input: AppointmentInput) {
  return {
    ...subjectColumns(input.subject),
    title: input.title.trim(),
    start_date: input.start.date,
    start_time: input.start.time,
    time_zone: input.start.timeZone,
    location: input.location,
    notes: input.notes,
    visibility: input.visibility,
  };
}

type InvitationRow = Omit<Row<'family_invitations'>, 'token_hash'>;

export function toInvitation(r: InvitationRow, now: number, token: string | null = null): FamilyInvitation {
  const expired = r.status === 'pending' && Date.parse(r.expires_at) <= now;
  return {
    id: r.id,
    familyId: r.family_id,
    invitedBy: r.invited_by,
    role: r.role,
    relationshipLabel: r.relationship_label,
    // The token exists only in the create response; it is never readable again.
    code: token ?? '',
    expiresAt: r.expires_at,
    status: expired ? 'expired' : r.status,
    createdAt: r.created_at,
  };
}
