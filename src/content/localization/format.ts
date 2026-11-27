/**
 * Locale-aware formatting of domain values. Keeps screens free of Intl calls.
 */
import { ageDisplay, ChildAge } from '@/domain/dates/age';
import { LocalDate, toParts } from '@/domain/dates/local-date';
import { displayValue, MeasurementUnit } from '@/domain/measurements/units';
import { intlLocale, t } from './index';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "27 Kasım 2026". Built from parts; never via Date, so no timezone shift. */
export function formatLocalDate(date: LocalDate, opts: { withYear?: boolean } = {}): string {
  const { year, month, day } = toParts(date);
  const base = `${day} ${MONTHS_TR[month - 1]}`;
  return opts.withYear === false ? base : `${base} ${year}`;
}

export function formatMonthYear(date: LocalDate): string {
  const { year, month } = toParts(date);
  return `${MONTHS_TR[month - 1]} ${year}`;
}

/** Numeric "27.11.2026" used in date inputs. */
export function formatLocalDateNumeric(date: LocalDate): string {
  const { year, month, day } = toParts(date);
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

export function formatAge(age: ChildAge): string {
  const d = ageDisplay(age);
  switch (d.kind) {
    case 'days':
      return t('child.ageDays', { days: d.days });
    case 'months':
      return d.days === 0 ? t('child.ageMonths', { months: d.months }) : t('child.ageMonthsDays', { months: d.months, days: d.days });
    case 'years':
      return d.months === 0 ? t('child.ageYears', { years: d.years }) : t('child.ageYearsMonths', { years: d.years, months: d.months });
  }
}

export function formatMeasurement(canonical: number, unit: MeasurementUnit): string {
  const value = displayValue(canonical, unit);
  const number = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 2 }).format(value);
  return `${number} ${t(`measurement.units.${unit}` as never)}`;
}

/** Localized zone name, e.g. "Europe/Istanbul" -> "Türkiye Saati". Falls back to the city part of the IANA id. */
export function formatTimeZoneLabel(timeZone: string): string {
  try {
    const part = new Intl.DateTimeFormat(intlLocale(), { timeZone, timeZoneName: 'longGeneric' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    if (part?.value && !/^GMT/.test(part.value)) return part.value;
  } catch {
    // fall through
  }
  return timeZone.replace(/_/g, ' ').split('/').pop() ?? timeZone;
}
