/**
 * Gestational age estimation. Policy documented in docs/date-rules.md.
 *
 * Convention (ACOG Committee Opinion 700; Naegele's rule):
 * - Gestational age is counted from the first day of the last menstrual period (LMP).
 * - Estimated due date (EDD) = LMP + 280 days (40w0d).
 * - A clinician-provided EDD, when present, is the active estimate. We derive an
 *   equivalent "LMP-equivalent" date = EDD - 280 days and never infer conception.
 * - Display is completed weeks + days ("12 hafta 3 gün" == 12w3d).
 * - Weekly content week N covers gestational days [7N, 7N + 6].
 */
import { addDays, daysBetween, LocalDate } from '../dates/local-date';

export const TERM_DAYS = 280;
export const CONTENT_FIRST_WEEK = 4;
export const CONTENT_LAST_WEEK = 42;
/** After 44w0d we stop showing a running gestational age at all. */
export const DISPLAY_LIMIT_DAYS = 44 * 7;

export type EstimateSource = 'clinician-due-date' | 'last-menstrual-period';

export interface DatingInput {
  clinicianDueDate?: LocalDate | null;
  lastMenstrualPeriod?: LocalDate | null;
}

export interface ActiveEstimate {
  source: EstimateSource;
  dueDate: LocalDate;
  /** Day 0 of gestation implied by the active estimate. */
  gestationStart: LocalDate;
}

export function activeEstimate(input: DatingInput): ActiveEstimate | null {
  if (input.clinicianDueDate) {
    return {
      source: 'clinician-due-date',
      dueDate: input.clinicianDueDate,
      gestationStart: addDays(input.clinicianDueDate, -TERM_DAYS),
    };
  }
  if (input.lastMenstrualPeriod) {
    return {
      source: 'last-menstrual-period',
      dueDate: addDays(input.lastMenstrualPeriod, TERM_DAYS),
      gestationStart: input.lastMenstrualPeriod,
    };
  }
  return null;
}

export type GestationPhase =
  | 'before-start' // today is before day 0 (data entry error or future LMP)
  | 'before-content' // week < CONTENT_FIRST_WEEK
  | 'in-range'
  | 'past-due' // >= 40w0d, still counting
  | 'beyond-display'; // >= 44w0d, we stop showing a running age

export interface GestationalAge {
  totalDays: number;
  weeks: number;
  days: number;
  phase: GestationPhase;
  daysUntilDue: number; // negative when past due
  /** Content week to show, or null when outside the content range. */
  contentWeek: number | null;
}

export function gestationalAge(estimate: ActiveEstimate, today: LocalDate): GestationalAge {
  const totalDays = daysBetween(estimate.gestationStart, today);
  const weeks = Math.floor(totalDays / 7);
  const days = ((totalDays % 7) + 7) % 7;
  const daysUntilDue = daysBetween(today, estimate.dueDate);

  let phase: GestationPhase;
  if (totalDays < 0) phase = 'before-start';
  else if (totalDays >= DISPLAY_LIMIT_DAYS) phase = 'beyond-display';
  else if (totalDays >= TERM_DAYS) phase = 'past-due';
  else if (weeks < CONTENT_FIRST_WEEK) phase = 'before-content';
  else phase = 'in-range';

  const contentWeek =
    totalDays >= 0 && weeks >= CONTENT_FIRST_WEEK && weeks <= CONTENT_LAST_WEEK ? weeks : null;

  return { totalDays, weeks, days, phase, daysUntilDue, contentWeek };
}

export type DatingValidationError =
  | 'missing'
  | 'lmp-in-future'
  | 'lmp-too-old'
  | 'due-date-too-far'
  | 'due-date-too-old';

/**
 * Plausibility checks only. They prevent typos (e.g. wrong year), not medical judgement.
 */
export function validateDating(input: DatingInput, today: LocalDate): DatingValidationError | null {
  if (input.clinicianDueDate) {
    const until = daysBetween(today, input.clinicianDueDate);
    if (until > TERM_DAYS) return 'due-date-too-far';
    if (until < -(DISPLAY_LIMIT_DAYS - TERM_DAYS)) return 'due-date-too-old';
    return null;
  }
  if (input.lastMenstrualPeriod) {
    const since = daysBetween(input.lastMenstrualPeriod, today);
    if (since < 0) return 'lmp-in-future';
    if (since >= DISPLAY_LIMIT_DAYS) return 'lmp-too-old';
    return null;
  }
  return 'missing';
}

/** Trimester by completed weeks: 1st <14w, 2nd 14w0d–27w6d, 3rd >=28w. */
export function trimester(weeks: number): 1 | 2 | 3 {
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}
