import { addDays, daysBetween, daysInMonth, fromParts, LocalDate, toParts } from './local-date';

export interface ChildAge {
  totalDays: number;
  /** Completed whole months since birth. */
  months: number;
  /** Days since the most recent month-anniversary. */
  daysAfterMonths: number;
  years: number;
  monthsAfterYears: number;
}

/**
 * Month-anniversary of a date, clamped to the last day of the target month.
 * Example: born 31 Jan -> anniversary in February is 28/29 Feb.
 * A child born on 29 Feb has their yearly anniversary on 28 Feb in common years.
 */
export function monthAnniversary(birth: LocalDate, monthsLater: number): LocalDate {
  const { year, month, day } = toParts(birth);
  const zeroBased = month - 1 + monthsLater;
  const targetYear = year + Math.floor(zeroBased / 12);
  const targetMonth = (((zeroBased % 12) + 12) % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return fromParts({ year: targetYear, month: targetMonth, day: targetDay });
}

/** Returns null when `today` is before the birth date (invalid / future birth). */
export function childAge(birth: LocalDate, today: LocalDate): ChildAge | null {
  const totalDays = daysBetween(birth, today);
  if (totalDays < 0) return null;

  const b = toParts(birth);
  const t = toParts(today);
  let months = (t.year - b.year) * 12 + (t.month - b.month);
  if (monthAnniversary(birth, months) > today) months -= 1;
  const anchor = monthAnniversary(birth, months);
  const daysAfterMonths = daysBetween(anchor, today);

  return {
    totalDays,
    months,
    daysAfterMonths,
    years: Math.floor(months / 12),
    monthsAfterYears: months % 12,
  };
}

export type AgeDisplay =
  | { kind: 'days'; days: number }
  | { kind: 'months'; months: number; days: number }
  | { kind: 'years'; years: number; months: number };

/** Presentation policy: days for the first month, months until 2 years, then years + months. */
export function ageDisplay(age: ChildAge): AgeDisplay {
  if (age.months < 1) return { kind: 'days', days: age.totalDays };
  if (age.months < 24) return { kind: 'months', months: age.months, days: age.daysAfterMonths };
  return { kind: 'years', years: age.years, months: age.monthsAfterYears };
}

export { addDays };
