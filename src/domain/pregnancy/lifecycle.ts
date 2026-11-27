/**
 * Pregnancy lifecycle. A pregnancy is its own entity; it is never renamed
 * into a child. Birth creates Child records linked by `originPregnancyId`.
 */
import type { Child, Pregnancy } from '../model';

export type PregnancyStatus = 'active' | 'born' | 'archived' | 'ended';

/** Allowed status transitions. "ended" is the sensitive stop (loss or other reasons); no reason is asked. */
const TRANSITIONS: Record<PregnancyStatus, PregnancyStatus[]> = {
  active: ['born', 'archived', 'ended'],
  born: ['archived'],
  archived: ['active'],
  ended: ['archived'],
};

export function canTransition(from: PregnancyStatus, to: PregnancyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function showsPregnancyContent(p: Pregnancy): boolean {
  return p.status === 'active' && !p.contentHidden;
}

export function sendsPregnancyReminders(p: Pregnancy): boolean {
  return p.status === 'active' && !p.remindersPaused;
}

export interface BirthChildInput {
  name: string;
  birthDate: Child['birthDate'];
  birthTime?: Child['birthTime'];
}

export type BirthValidationError = 'pregnancy-not-active' | 'no-children' | 'child-name-required' | 'too-many-children';

export const MAX_CHILDREN_PER_BIRTH = 4;

export function validateBirth(p: Pregnancy, children: BirthChildInput[]): BirthValidationError | null {
  if (p.status !== 'active') return 'pregnancy-not-active';
  if (children.length === 0) return 'no-children';
  if (children.length > MAX_CHILDREN_PER_BIRTH) return 'too-many-children';
  if (children.some((c) => c.name.trim().length === 0)) return 'child-name-required';
  return null;
}
