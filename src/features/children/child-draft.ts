import { t } from '@/content/localization';
import { compareLocalDates, LocalDate } from '@/domain/dates/local-date';
import { parseLocalTime } from '@/domain/dates/zoned-date-time';
import { MeasurementInputError, MeasurementUnit, normalizeMeasurement } from '@/domain/measurements/units';
import type { MeasurementKind } from '@/domain/model';
import type { NewChildInput } from '@/data/repositories/types';

export interface ChildDraft {
  key: string;
  name: string;
  birthDate: LocalDate | null;
  birthTime: string;
  weight: string;
  length: string;
  head: string;
  photoUri: string | null;
}

export const emptyChildDraft = (birthDate: LocalDate | null = null): ChildDraft => ({
  key: Math.random().toString(36).slice(2),
  name: '',
  birthDate,
  birthTime: '',
  weight: '',
  length: '',
  head: '',
  photoUri: null,
});

export const measurementErrorText: Record<MeasurementInputError, string> = {
  empty: t('errors.required'),
  'not-a-number': t('errors.notANumber'),
  'not-positive': t('errors.notPositive'),
  implausible: t('errors.implausible'),
  'unit-mismatch': t('errors.implausible'),
};

export type ChildDraftErrors = Partial<Record<'name' | 'birthDate' | 'birthTime' | 'weight' | 'length' | 'head', string>>;

const FIELDS: [keyof ChildDraft & ('weight' | 'length' | 'head'), MeasurementKind, MeasurementUnit][] = [
  ['weight', 'weight', 'kg'],
  ['length', 'length', 'cm'],
  ['head', 'head-circumference', 'cm'],
];

export function validateChildDraft(d: ChildDraft, today: LocalDate): { errors: ChildDraftErrors; input: Omit<NewChildInput, 'familyId' | 'originPregnancyId'> | null } {
  const errors: ChildDraftErrors = {};
  if (!d.name.trim()) errors.name = t('errors.required');
  if (!d.birthDate) errors.birthDate = t('errors.required');
  else if (compareLocalDates(d.birthDate, today) > 0) errors.birthDate = t('errors.birthInFuture');
  const time = d.birthTime.trim() ? parseLocalTime(d.birthTime.trim()) : null;
  if (d.birthTime.trim() && !time) errors.birthTime = t('errors.invalidTime');
  const birthMeasurements: NewChildInput['birthMeasurements'] = [];
  for (const [field, kind, unit] of FIELDS) {
    if (!d[field].trim()) continue;
    const r = normalizeMeasurement(kind, d[field], unit);
    if (r.ok) birthMeasurements.push({ kind, canonicalValue: r.canonicalValue, enteredUnit: unit });
    else errors[field] = measurementErrorText[r.error];
  }
  if (Object.keys(errors).length) return { errors, input: null };
  return { errors, input: { name: d.name.trim(), birthDate: d.birthDate!, birthTime: time, avatarLocalUri: d.photoUri, birthMeasurements } };
}
