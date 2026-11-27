/**
 * Test data builders. All names and values are fictional.
 */
import { localDate } from '@/domain/dates/local-date';
import { localTime } from '@/domain/dates/zoned-date-time';
import type { Appointment, Child, GrowthMeasurement, Memory, Pregnancy } from '@/domain/model';

const T0 = '2026-11-01T09:00:00.000Z';
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function buildPregnancy(overrides: Partial<Pregnancy> = {}): Pregnancy {
  return {
    id: nextId('preg'),
    familyId: 'family-1',
    nickname: 'Fıstık',
    clinicianDueDate: null,
    lastMenstrualPeriod: localDate('2026-06-01'),
    status: 'active',
    remindersPaused: false,
    contentHidden: false,
    createdBy: 'u-owner',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

export function buildChild(overrides: Partial<Child> = {}): Child {
  return {
    id: nextId('child'),
    familyId: 'family-1',
    name: 'Deniz',
    birthDate: localDate('2026-05-10'),
    birthTime: null,
    originPregnancyId: null,
    avatarMediaId: null,
    createdBy: 'u-owner',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

export function buildMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: nextId('mem'),
    familyId: 'family-1',
    subject: { kind: 'child', childId: 'c1' },
    title: 'Örnek anı',
    body: 'Kurgusal bir anı metni.',
    eventDate: localDate('2026-11-01'),
    mediaIds: [],
    visibility: 'family',
    authorId: 'u-adult',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

export function buildMeasurement(overrides: Partial<GrowthMeasurement> = {}): GrowthMeasurement {
  return {
    id: nextId('meas'),
    familyId: 'family-1',
    childId: 'c1',
    kind: 'weight',
    canonicalValue: 3400,
    enteredUnit: 'kg',
    measuredOn: localDate('2026-05-10'),
    isBirthMeasurement: false,
    authorId: 'u-adult',
    createdAt: T0,
    ...overrides,
  };
}

export function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: nextId('appt'),
    familyId: 'family-1',
    subject: null,
    title: 'Kontrol',
    start: { date: localDate('2026-12-01'), time: localTime('10:00'), timeZone: 'Europe/Istanbul' },
    location: null,
    notes: null,
    visibility: 'family',
    authorId: 'u-adult',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}
