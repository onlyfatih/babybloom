/**
 * Application-level domain types. Transport/database records are mapped into
 * these in src/data/mapping. UI and features depend on these, never on rows.
 * See docs/data-model.md for the relational schema.
 */
import type { LocalDate } from './dates/local-date';
import type { LocalTime, ZonedDateTime } from './dates/zoned-date-time';
import type { PregnancyStatus } from './pregnancy/lifecycle';

export type Id = string;
/** ISO-8601 UTC instant, e.g. "2026-11-27T18:30:00.000Z". */
export type Instant = string;

export interface User {
  id: Id;
  displayName: string;
}

export type FamilyRole = 'owner' | 'adult';

export interface Family {
  id: Id;
  name: string;
  createdBy: Id;
  createdAt: Instant;
}

export interface FamilyMembership {
  id: Id;
  familyId: Id;
  userId: Id;
  role: FamilyRole;
  /** e.g. "Anne", "Baba", "Babaanne" – free text the family chooses. */
  relationshipLabel: string;
  /** 'left': the member left on their own; 'revoked': an owner removed them. */
  status: 'active' | 'revoked' | 'left';
  joinedAt: Instant;
  revokedAt: Instant | null;
}

export interface FamilyInvitation {
  id: Id;
  familyId: Id;
  invitedBy: Id;
  role: FamilyRole;
  relationshipLabel: string;
  /** Shown to the inviter only once; stored server-side as a hash. */
  code: string;
  expiresAt: Instant;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: Instant;
}

export interface Pregnancy {
  id: Id;
  familyId: Id;
  nickname: string | null;
  clinicianDueDate: LocalDate | null;
  lastMenstrualPeriod: LocalDate | null;
  status: PregnancyStatus;
  remindersPaused: boolean;
  contentHidden: boolean;
  createdBy: Id;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface Child {
  id: Id;
  familyId: Id;
  name: string;
  birthDate: LocalDate;
  birthTime: LocalTime | null;
  /** Explicit relationship to the pregnancy this child was born from (nullable). */
  originPregnancyId: Id | null;
  avatarMediaId: Id | null;
  createdBy: Id;
  createdAt: Instant;
  updatedAt: Instant;
}

/** Exactly one subject per memory, enforced by a CHECK constraint server-side. */
export type ProfileRef = { kind: 'pregnancy'; pregnancyId: Id } | { kind: 'child'; childId: Id };

export type Visibility = 'family' | 'private';

export interface MediaAsset {
  id: Id;
  familyId: Id;
  /** Private storage object key. Never a public URL, never base64. */
  storageKey: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp';
  width: number;
  height: number;
  byteSize: number;
  status: 'pending' | 'ready' | 'orphaned';
  uploadedBy: Id;
  createdAt: Instant;
}

export interface Memory {
  id: Id;
  familyId: Id;
  subject: ProfileRef;
  title: string | null;
  body: string | null;
  /** When it happened (date-only). Separate from createdAt. */
  eventDate: LocalDate;
  mediaIds: Id[];
  visibility: Visibility;
  authorId: Id;
  createdAt: Instant;
  updatedAt: Instant;
}

export type MeasurementKind = 'weight' | 'length' | 'head-circumference';

export interface GrowthMeasurement {
  id: Id;
  familyId: Id;
  childId: Id;
  kind: MeasurementKind;
  /** Canonical integer value: grams for weight, millimetres for lengths. */
  canonicalValue: number;
  /** The unit the parent entered, kept for display fidelity. */
  enteredUnit: string;
  measuredOn: LocalDate;
  isBirthMeasurement: boolean;
  authorId: Id;
  createdAt: Instant;
}

export interface Appointment {
  id: Id;
  familyId: Id;
  /** Optional: which profile the appointment concerns. Appointments can also be family-level. */
  subject: ProfileRef | null;
  title: string;
  start: ZonedDateTime;
  location: string | null;
  notes: string | null;
  visibility: Visibility;
  authorId: Id;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface UserPreference {
  userId: Id;
  selectedProfile: ProfileRef | null;
  locale: 'tr';
  measurementSystem: 'metric' | 'imperial';
  notifications: {
    appointmentReminders: boolean;
    weeklyPregnancyUpdate: boolean;
  };
}

export interface ContentRelease {
  id: Id;
  locale: string;
  version: string; // semver of the bundled/hosted content set
  publishedAt: Instant;
  weekCoverage: number[];
}
