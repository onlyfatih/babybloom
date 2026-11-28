/**
 * Supabase implementation of the Backend contract (R2). Plain records use
 * RLS-protected table calls; lifecycle operations use the RPCs in
 * backend/supabase/migrations/*_rpc.sql. Authorization is the server's job;
 * nothing here grants access.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaAsset, UserPreference } from '@/domain/model';
import { newRequestId } from '@/infrastructure/ids/request-id';
import { Backend, DataError, LocalPhoto, UploadSlot } from '../../repositories/types';
import type { Database } from './database.types';
import { toDataError, unwrap, unwrapData } from './errors';
import { appointmentColumns, compareMemories, MemoryRow, subjectColumns, toAppointment, toChild, toInvitation, toMeasurement, toMemory, toPregnancy } from './mapping';

type Client = SupabaseClient<Database>;
export const MEDIA_BUCKET = 'family-media';
/** Signed URL lifetime. Short, so a revoked member's copies stop working soon. */
export const SIGNED_URL_SECONDS = 600;
const MEMORY_COLUMNS = '*, memory_media(media_id, position)';
const INVITATION_COLUMNS = 'id, family_id, invited_by, role, relationship_label, expires_at, status, accepted_by, accepted_at, revoked_at, created_at';

async function requireUserId(client: Client): Promise<string> {
  const { data } = await client.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new DataError('session-expired');
  return id;
}

/** Reads the photo bytes from a local file URI (file://, content:// or blob:). */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(uri);
    return await res.arrayBuffer();
  } catch {
    throw new DataError('upload-failed', 'local-file-unreadable');
  }
}

/**
 * The generated RPC arg types mark every parameter as non-null, but the SQL
 * functions accept NULL for optional values. PostgREST needs an explicit null
 * (an omitted key would select a different overload), so pass null typed as T.
 */
function sqlNull<T>(value: T | null | undefined): T {
  return (value ?? null) as T;
}

/**
 * Uploads a processed profile photo and attaches it to the child: reserve an
 * avatar slot, upload, then `set_child_avatar` verifies the stored object on
 * the server. Retrying after a failure is safe (the child already exists; a
 * new slot is reserved; abandoned pending slots are cleaned up server-side).
 */
async function attachAvatar(client: Client, familyId: string, childId: string, photo: LocalPhoto): Promise<string> {
  const rows = await unwrapData(
    client.rpc('reserve_media_upload', { p_family_id: familyId, p_purpose: 'avatar', p_mime_type: photo.mimeType, p_byte_size: Math.max(1, photo.byteSize), p_width: photo.width, p_height: photo.height }),
  );
  const slot = rows[0];
  if (!slot) throw new DataError('unknown', 'no-slot');
  await putObject(client, slot.storage_key, photo);
  await unwrap(client.rpc('set_child_avatar', { p_child_id: childId, p_media_id: slot.media_id }));
  return slot.media_id;
}

async function putObject(client: Client, key: string, photo: LocalPhoto): Promise<void> {
  const bytes = await readBytes(photo.uri);
  const { error } = await client.storage.from(MEDIA_BUCKET).upload(key, bytes, { contentType: photo.mimeType, upsert: false });
  // A retry after a lost response finds the object already there: that is success.
  if (error && !/exists|Duplicate/i.test(error.message)) {
    const d = toDataError(error);
    throw d.code === 'offline' ? d : new DataError('upload-failed', error.message);
  }
}

export function createSupabaseBackend(client: Client): Backend {
  return {
    name: 'supabase',
    capabilities: { photos: true },

    // Legacy combined auth contract, used only by demo-era screens. Real
    // identity lives in the session backend (session-backend.ts).
    auth: {
      async getSession() {
        throw new DataError('unknown', 'use-session-controller');
      },
      async createFamily() {
        throw new DataError('unknown', 'use-session-controller');
      },
      async acceptInvitation() {
        throw new DataError('unknown', 'use-session-controller');
      },
      async signOut() {
        await client.auth.signOut({ scope: 'local' });
      },
    },

    profiles: {
      async list(familyId) {
        const [p, c] = await Promise.all([
          unwrapData(client.from('pregnancies').select('*').eq('family_id', familyId).order('created_at')),
          unwrapData(client.from('children').select('*').eq('family_id', familyId).order('birth_date').order('created_at')),
        ]);
        return { pregnancies: p.map(toPregnancy), children: c.map(toChild) };
      },
      async createPregnancy(input, options) {
        const uid = await requireUserId(client);
        // The request id doubles as the row id: a retry after a lost response finds the row instead of creating a second one.
        const id = options?.requestId ?? newRequestId();
        const { data, error } = await client
          .from('pregnancies')
          .insert({ id, family_id: input.familyId, nickname: input.nickname, clinician_due_date: input.clinicianDueDate, last_menstrual_period: input.lastMenstrualPeriod, created_by: uid })
          .select('*')
          .single();
        if (error?.code === '23505') return toPregnancy(await unwrapData(client.from('pregnancies').select('*').eq('id', id).single()));
        if (error) throw toDataError(error);
        return toPregnancy(data);
      },
      async updatePregnancy(id, patch) {
        const row = await unwrap(
          client
            .from('pregnancies')
            .update({
              ...(patch.nickname !== undefined ? { nickname: patch.nickname } : {}),
              ...(patch.clinicianDueDate !== undefined ? { clinician_due_date: patch.clinicianDueDate } : {}),
              ...(patch.lastMenstrualPeriod !== undefined ? { last_menstrual_period: patch.lastMenstrualPeriod } : {}),
              ...(patch.status !== undefined ? { status: patch.status } : {}),
              ...(patch.remindersPaused !== undefined ? { reminders_paused: patch.remindersPaused } : {}),
              ...(patch.contentHidden !== undefined ? { content_hidden: patch.contentHidden } : {}),
            })
            .eq('id', id)
            .select('*')
            .maybeSingle(),
        );
        // RLS hides rows the caller may not change (other family, revoked, missing): no row, never a mapped null.
        if (!row) throw new DataError('forbidden');
        return toPregnancy(row);
      },
      async createChild(input, options) {
        const id = await unwrapData(
          client.rpc('create_child', {
            p_family_id: input.familyId,
            p_name: input.name.trim(),
            p_birth_date: input.birthDate,
            p_birth_time: sqlNull(input.birthTime),
            p_measurements: input.birthMeasurements.map((m) => ({ kind: m.kind, canonical_value: m.canonicalValue, entered_unit: m.enteredUnit })),
            p_request_id: options?.requestId ?? newRequestId(),
          }),
        );
        let row = await unwrapData(client.from('children').select('*').eq('id', id).single());
        if (input.avatar && !row.avatar_media_id) {
          await attachAvatar(client, input.familyId, id, input.avatar);
          row = await unwrapData(client.from('children').select('*').eq('id', id).single());
        }
        return toChild(row);
      },
      async recordBirth(pregnancyId, children, options) {
        const ids = await unwrapData(
          client.rpc('record_birth', {
            p_pregnancy_id: pregnancyId,
            p_request_id: options?.requestId ?? newRequestId(),
            p_children: children.map((c) => ({
              name: c.name.trim(),
              birth_date: c.birthDate,
              birth_time: c.birthTime,
              measurements: c.birthMeasurements.map((m) => ({ kind: m.kind, canonical_value: m.canonicalValue, entered_unit: m.enteredUnit })),
            })),
          }),
        );
        let rows = await unwrapData(client.from('children').select('*').in('id', ids));
        // Photos after the birth itself: the birth is already recorded if an upload fails.
        // Matched by name, not by position: a retried birth returns its children in a different order.
        const withPhotos = children.map((c) => {
          const matches = rows.filter((r) => r.name === c.name.trim());
          return { photo: c.avatar, row: matches.length === 1 ? matches[0] : undefined };
        });
        for (const { photo, row } of withPhotos) if (photo && row && !row.avatar_media_id) await attachAvatar(client, row.family_id, row.id, photo);
        if (withPhotos.some((w) => w.photo)) rows = await unwrapData(client.from('children').select('*').in('id', ids));
        return rows.map(toChild);
      },
    },

    memories: {
      async list(familyId) {
        const rows = await unwrapData(
          client.from('memories').select(MEMORY_COLUMNS).eq('family_id', familyId).order('event_date', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }),
        );
        return (rows as MemoryRow[]).map(toMemory).sort(compareMemories);
      },
      async get(id) {
        const row = await unwrap(client.from('memories').select(MEMORY_COLUMNS).eq('id', id).maybeSingle());
        // Missing and not-allowed look the same (private records do not leak).
        if (!row) throw new DataError('not-found');
        return toMemory(row as MemoryRow);
      },
      async prepareUploads(familyId, photos: LocalPhoto[]): Promise<UploadSlot[]> {
        const slots: UploadSlot[] = [];
        for (const photo of photos) {
          const rows = await unwrapData(
            client.rpc('reserve_media_upload', { p_family_id: familyId, p_purpose: 'memory', p_mime_type: photo.mimeType, p_byte_size: Math.max(1, photo.byteSize), p_width: photo.width, p_height: photo.height }),
          );
          const r = rows[0];
          if (!r) throw new DataError('unknown', 'no-slot');
          slots.push({ localId: photo.localId, mediaId: r.media_id, target: r.storage_key });
        }
        return slots;
      },
      async uploadPhoto(slot, photo, onProgress) {
        onProgress(0);
        const key = slot.target || (await unwrapData(client.from('media_assets').select('storage_key').eq('id', slot.mediaId).single())).storage_key;
        await putObject(client, key, photo);
        onProgress(1);
      },
      async finalize(input, { memoryId, clientRequestId, expectedVersion }) {
        const subject = subjectColumns(input.subject);
        const id = await unwrapData(
          client.rpc('finalize_memory', {
            p_family_id: input.familyId,
            p_memory_id: sqlNull(memoryId),
            p_client_request_id: clientRequestId,
            p_pregnancy_id: sqlNull(subject.pregnancy_id),
            p_child_id: sqlNull(subject.child_id),
            p_title: sqlNull(input.title),
            p_body: sqlNull(input.body),
            p_event_date: input.eventDate,
            p_visibility: input.visibility,
            p_media_ids: input.mediaIds,
            p_expected_version: sqlNull(expectedVersion),
          }),
        );
        const row = await unwrapData(client.from('memories').select(MEMORY_COLUMNS).eq('id', id).single());
        return toMemory(row as MemoryRow);
      },
      async remove(id) {
        const before = await unwrap(client.from('memories').select('memory_media(media_id)').eq('id', id).maybeSingle());
        const deleted = await unwrapData(client.from('memories').delete().eq('id', id).select('id'));
        if (!deleted.length) throw new DataError(before ? 'forbidden' : 'not-found');
        // Objects are queued for deletion server-side (outbox, worker in R5). New
        // signed URLs are refused at once; a URL issued earlier keeps working
        // until it expires (SIGNED_URL_SECONDS) or the worker removes the object.
        return { deletedMediaIds: (before?.memory_media ?? []).map((m) => m.media_id) };
      },
      async resolveMedia(mediaId) {
        // The row is readable only if the photo is (RLS app.can_read_media), so
        // a private memory's photo resolves to null for everyone but its author.
        const row = await unwrap(client.from('media_assets').select('storage_key, status').eq('id', mediaId).maybeSingle());
        if (!row || row.status !== 'ready') return null;
        const issuedAt = Date.now();
        const { data, error } = await client.storage.from(MEDIA_BUCKET).createSignedUrl(row.storage_key, SIGNED_URL_SECONDS);
        if (error) {
          // Object gone (deleted, never uploaded) or policy refused: nothing to show.
          if (/not.?found|object not found|404|400/i.test(`${error.message} ${(error as { statusCode?: string }).statusCode ?? ''}`)) return null;
          throw toDataError(error);
        }
        return { uri: data.signedUrl, expiresAt: issuedAt + SIGNED_URL_SECONDS * 1000 };
      },
    },

    measurements: {
      async listForChild(childId) {
        const rows = await unwrapData(client.from('growth_measurements').select('*').eq('child_id', childId).order('measured_on').order('created_at'));
        return rows.map(toMeasurement);
      },
      async create(input) {
        const uid = await requireUserId(client);
        const row = await unwrapData(
          client
            .from('growth_measurements')
            .insert({ family_id: input.familyId, child_id: input.childId, kind: input.kind, canonical_value: input.canonicalValue, entered_unit: input.enteredUnit, measured_on: input.measuredOn, author_id: uid })
            .select('*')
            .single(),
        );
        return toMeasurement(row);
      },
      async remove(id) {
        const rows = await unwrapData(client.from('growth_measurements').delete().eq('id', id).select('id'));
        if (!rows.length) throw new DataError('forbidden');
      },
    },

    appointments: {
      async list(familyId) {
        const rows = await unwrapData(client.from('appointments').select('*').eq('family_id', familyId).order('start_date').order('start_time'));
        return rows.map(toAppointment);
      },
      async create(input) {
        const uid = await requireUserId(client);
        const row = await unwrapData(client.from('appointments').insert({ family_id: input.familyId, author_id: uid, ...appointmentColumns(input) }).select('*').single());
        return toAppointment(row);
      },
      async update(id, input) {
        const row = await unwrap(client.from('appointments').update(appointmentColumns(input)).eq('id', id).select('*').maybeSingle());
        if (!row) throw new DataError('forbidden');
        return toAppointment(row);
      },
      async remove(id) {
        const rows = await unwrapData(client.from('appointments').delete().eq('id', id).select('id'));
        if (!rows.length) throw new DataError('forbidden');
      },
    },

    family: {
      async members(familyId) {
        const rows = await unwrapData(client.from('family_memberships').select('*').eq('family_id', familyId).order('joined_at'));
        return rows.map((r) => ({
          id: r.id,
          familyId: r.family_id,
          userId: r.user_id,
          role: r.role,
          relationshipLabel: r.relationship_label,
          status: r.status,
          joinedAt: r.joined_at,
          revokedAt: r.ended_at,
          user: { id: r.user_id, displayName: r.display_name },
        }));
      },
      async invitations(familyId) {
        // Non-owners get an empty list from RLS, which is what the UI expects.
        const rows = await unwrapData(client.from('family_invitations').select(INVITATION_COLUMNS).eq('family_id', familyId).order('created_at', { ascending: false }));
        const now = Date.now();
        return rows.map((r) => toInvitation(r, now));
      },
      async createInvitation({ familyId, relationshipLabel }) {
        // The role is always 'adult' server-side; the argument is ignored on purpose.
        const rows = await unwrapData(client.rpc('create_invitation', { p_family_id: familyId, p_relationship_label: relationshipLabel }));
        const created = rows[0];
        if (!created) throw new DataError('unknown');
        const row = await unwrapData(client.from('family_invitations').select(INVITATION_COLUMNS).eq('id', created.invitation_id).single());
        return toInvitation(row, Date.now(), created.token);
      },
      async revokeInvitation(id) {
        await unwrap(client.rpc('revoke_invitation', { p_invitation_id: id }));
      },
      async revokeMember(membershipId) {
        await unwrap(client.rpc('revoke_member', { p_membership_id: membershipId }));
      },
    },

    preferences: {
      async get(userId) {
        const row = await unwrap(client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle());
        return toPreference(userId, row);
      },
      async update(userId, patch) {
        const values: Database['public']['Tables']['user_preferences']['Update'] = {};
        if (patch.selectedProfile !== undefined) {
          values.selected_child_id = patch.selectedProfile?.kind === 'child' ? patch.selectedProfile.childId : null;
          values.selected_pregnancy_id = patch.selectedProfile?.kind === 'pregnancy' ? patch.selectedProfile.pregnancyId : null;
        }
        if (patch.measurementSystem) values.measurement_system = patch.measurementSystem;
        const row = await unwrap(client.from('user_preferences').upsert({ user_id: userId, ...values }, { onConflict: 'user_id' }).select('*').single());
        return toPreference(userId, row);
      },
    },
  };
}

function toPreference(userId: string, row: Database['public']['Tables']['user_preferences']['Row'] | null): UserPreference {
  return {
    userId,
    selectedProfile: row?.selected_child_id
      ? { kind: 'child', childId: row.selected_child_id }
      : row?.selected_pregnancy_id
        ? { kind: 'pregnancy', pregnancyId: row.selected_pregnancy_id }
        : null,
    locale: 'tr',
    measurementSystem: (row?.measurement_system as UserPreference['measurementSystem']) ?? 'metric',
    // No notification is implemented in V1; these are never "on" for the real backend.
    notifications: { appointmentReminders: false, weeklyPregnancyUpdate: false },
  };
}

export type { MediaAsset };
