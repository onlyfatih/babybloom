/**
 * Repository contracts. Features depend on these interfaces only.
 * Implementations live in src/data/providers/<provider>/ and map their own
 * records into domain types (src/data/mapping). Swapping the backend means
 * writing a new provider, not editing screens. See docs/architecture.md.
 */
import type { LocalDate } from '@/domain/dates/local-date';
import type { LocalTime, ZonedDateTime } from '@/domain/dates/zoned-date-time';
import type { MeasurementUnit } from '@/domain/measurements/units';
import type {
  Appointment,
  Child,
  Family,
  FamilyInvitation,
  FamilyMembership,
  FamilyRole,
  GrowthMeasurement,
  Id,
  MeasurementKind,
  MediaAsset,
  Memory,
  Pregnancy,
  ProfileRef,
  User,
  UserPreference,
  Visibility,
} from '@/domain/model';

export type DataErrorCode =
  | 'offline'
  | 'session-expired'
  | 'forbidden'
  | 'membership-revoked'
  | 'not-found'
  | 'invalid-invitation'
  | 'upload-failed'
  | 'validation'
  | 'unknown';

export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DataError';
  }
}

/** `expiresAt` (epoch ms) is when the source stops working; null for local/bundled sources. */
export interface MediaSource {
  uri: string | number;
  expiresAt: number | null;
}

export interface SessionInfo {
  user: User;
  family: Family;
  membership: FamilyMembership;
}

export interface AuthRepository {
  getSession(): Promise<SessionInfo | null>;
  createFamily(input: { displayName: string; relationshipLabel: string }): Promise<SessionInfo>;
  acceptInvitation(input: { code: string; displayName: string }): Promise<SessionInfo>;
  signOut(): Promise<void>;
}

export interface NewPregnancyInput {
  familyId: Id;
  nickname: string | null;
  clinicianDueDate: LocalDate | null;
  lastMenstrualPeriod: LocalDate | null;
}

export interface NewChildInput {
  familyId: Id;
  name: string;
  birthDate: LocalDate;
  birthTime: LocalTime | null;
  originPregnancyId: Id | null;
  /** Processed profile photo to upload with the child (optional). */
  avatar: LocalPhoto | null;
  birthMeasurements: { kind: MeasurementKind; canonicalValue: number; enteredUnit: MeasurementUnit }[];
}

export interface ProfileRepository {
  list(familyId: Id): Promise<{ pregnancies: Pregnancy[]; children: Child[] }>;
  createPregnancy(input: NewPregnancyInput, options?: { requestId: string }): Promise<Pregnancy>;
  updatePregnancy(id: Id, patch: Partial<Pick<Pregnancy, 'nickname' | 'clinicianDueDate' | 'lastMenstrualPeriod' | 'status' | 'remindersPaused' | 'contentHidden'>>): Promise<Pregnancy>;
  /** Atomic with birth measurements. `requestId` makes retries return the same child. */
  createChild(input: NewChildInput, options?: { requestId?: string }): Promise<Child>;
  /**
   * Atomic server-side: marks pregnancy born, creates children linked by
   * originPregnancyId. Memories are untouched. Pass the same `requestId` when
   * retrying the same submission; a different request after birth is refused.
   */
  recordBirth(pregnancyId: Id, children: Omit<NewChildInput, 'familyId' | 'originPregnancyId'>[], options?: { requestId?: string }): Promise<Child[]>;
  /** Any active member (profiles are family records). */
  updateChild(id: Id, patch: ChildPatch): Promise<Child>;
  /** Owner only. Archived profiles keep every record and can be restored. */
  setChildArchived(id: Id, archived: boolean): Promise<Child>;
  /** Replaces (or with null removes) the profile photo; the old photo is queued for deletion. */
  setChildPhoto(id: Id, photo: LocalPhoto | null): Promise<Child>;
}

export type ChildPatch = Partial<Pick<Child, 'name' | 'birthDate' | 'birthTime'>>;

export interface LocalPhoto {
  localId: string;
  uri: string;
  width: number;
  height: number;
  byteSize: number;
  mimeType: MediaAsset['mimeType'];
}

export interface UploadSlot {
  localId: string;
  mediaId: Id;
  /** Signed, short-lived upload target (Supabase) or a local key (demo). */
  target: string;
}

export interface MemoryInput {
  familyId: Id;
  subject: ProfileRef;
  title: string | null;
  body: string | null;
  eventDate: LocalDate;
  visibility: Visibility;
  mediaIds: Id[];
}

export interface MemoryRepository {
  list(familyId: Id): Promise<Memory[]>;
  get(id: Id): Promise<Memory>;
  /** Stage 1: create pending media rows and upload targets. */
  prepareUploads(familyId: Id, photos: LocalPhoto[]): Promise<UploadSlot[]>;
  /** Stage 2: upload one photo. Rejects with DataError('upload-failed'). */
  uploadPhoto(slot: UploadSlot, photo: LocalPhoto, onProgress: (fraction: number) => void): Promise<void>;
  /** Stage 3: create or update the memory referencing only uploaded media. Idempotent per clientRequestId. */
  finalize(input: MemoryInput, options: { memoryId?: Id; clientRequestId: string; expectedVersion?: number }): Promise<Memory>;
  /** Deletes the memory row and its media objects. */
  remove(id: Id): Promise<{ deletedMediaIds: Id[] }>;
  /**
   * Resolves a renderable source for a media id (R3). Asynchronous because a
   * real source is a short-lived signed URL. Resolves to null when the file is
   * missing, deleted, still uploading or not visible to this user (the same
   * answer for all four, so private photos do not leak their existence).
   */
  resolveMedia(mediaId: Id): Promise<MediaSource | null>;
}

export interface NewMeasurementInput {
  familyId: Id;
  childId: Id;
  kind: MeasurementKind;
  canonicalValue: number;
  enteredUnit: MeasurementUnit;
  measuredOn: LocalDate;
}

export interface MeasurementRepository {
  listForChild(childId: Id): Promise<GrowthMeasurement[]>;
  create(input: NewMeasurementInput): Promise<GrowthMeasurement>;
  /** Correction by the author: value, unit and date. The kind never changes. */
  update(id: Id, correction: MeasurementCorrection): Promise<GrowthMeasurement>;
  remove(id: Id): Promise<void>;
}

export interface MeasurementCorrection {
  canonicalValue: number;
  enteredUnit: MeasurementUnit;
  measuredOn: LocalDate;
  note?: string | null;
}

export interface AppointmentInput {
  familyId: Id;
  subject: ProfileRef | null;
  title: string;
  start: ZonedDateTime;
  location: string | null;
  notes: string | null;
  visibility: Visibility;
}

export interface AppointmentRepository {
  list(familyId: Id): Promise<Appointment[]>;
  create(input: AppointmentInput): Promise<Appointment>;
  update(id: Id, input: AppointmentInput): Promise<Appointment>;
  remove(id: Id): Promise<void>;
}

export type MemberWithUser = FamilyMembership & { user: User };

export interface FamilyRepository {
  members(familyId: Id): Promise<MemberWithUser[]>;
  invitations(familyId: Id): Promise<FamilyInvitation[]>;
  createInvitation(input: { familyId: Id; role: FamilyRole; relationshipLabel: string }): Promise<FamilyInvitation>;
  revokeInvitation(id: Id): Promise<void>;
  revokeMember(membershipId: Id): Promise<void>;
}

export interface PreferenceRepository {
  get(userId: Id): Promise<UserPreference>;
  update(userId: Id, patch: Partial<Omit<UserPreference, 'userId'>>): Promise<UserPreference>;
}

/** The whole data surface the app needs. One provider implements all of it. */
export interface Backend {
  name: string;
  /** What this provider can do today. The UI hides what is not implemented instead of pretending. */
  capabilities: { photos: boolean };
  auth: AuthRepository;
  profiles: ProfileRepository;
  memories: MemoryRepository;
  measurements: MeasurementRepository;
  appointments: AppointmentRepository;
  family: FamilyRepository;
  preferences: PreferenceRepository;
}
