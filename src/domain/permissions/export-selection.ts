/**
 * Export only what the actor is allowed to view AND explicitly selected.
 * The server repeats this filter; the client copy keeps the preview honest.
 */
import type { Appointment, GrowthMeasurement, Memory, ProfileRef } from '../model';
import { Actor, canOnRecord } from './permissions';

export interface ExportSelection {
  profile: ProfileRef;
  include: { memories: boolean; measurements: boolean; appointments: boolean };
}

export interface ExportSource {
  memories: Memory[];
  measurements: GrowthMeasurement[];
  appointments: Appointment[];
}

function sameProfile(a: ProfileRef | null, b: ProfileRef): boolean {
  if (!a) return false;
  if (a.kind === 'pregnancy' && b.kind === 'pregnancy') return a.pregnancyId === b.pregnancyId;
  if (a.kind === 'child' && b.kind === 'child') return a.childId === b.childId;
  return false;
}

export function selectForExport(actor: Actor, source: ExportSource, selection: ExportSelection): ExportSource {
  const memories = selection.include.memories
    ? source.memories.filter((m) => sameProfile(m.subject, selection.profile) && canOnRecord(actor, 'view', m))
    : [];
  const measurements =
    selection.include.measurements && selection.profile.kind === 'child'
      ? source.measurements.filter(
          (m) =>
            m.childId === (selection.profile as { childId: string }).childId &&
            canOnRecord(actor, 'view', { familyId: m.familyId, authorId: m.authorId, visibility: 'family' }),
        )
      : [];
  const appointments = selection.include.appointments
    ? source.appointments.filter((a) => sameProfile(a.subject, selection.profile) && canOnRecord(actor, 'view', a))
    : [];
  return { memories, measurements, appointments };
}
