/**
 * R2 exit: account → family → child → text memory → relaunch, through the
 * app's own Backend and SessionController against the local stack. Sign-in
 * uses real email codes (Mailpit). No service-role access is used for any
 * assertion; the admin connection only deletes test data afterwards.
 */
import { randomUUID } from 'node:crypto';
import { createSupabaseBackend } from '@/data/providers/supabase/supabase-backend';
import { createSupabaseSessionBackend } from '@/data/providers/supabase/session-backend';
import { DataError } from '@/data/repositories/types';
import { SessionController } from '@/data/session/session-controller';
import type { LocalDate } from '@/domain/dates/local-date';
import { appClient, signInWithCode } from './app-client';
import { sql } from './harness';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const emails: string[] = [];
const email = (label: string) => {
  const e = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  emails.push(e);
  return e;
};

afterAll(async () => {
  await sql(`delete from public.families where created_by in (select id from auth.users where email = any($1))`, [emails]);
  await sql(`delete from auth.users where email = any($1)`, [emails]);
});

async function controllerFor(device: ReturnType<typeof appClient>) {
  const controller = new SessionController({ backend: createSupabaseSessionBackend(device.client), onScopeChange: () => undefined });
  await controller.start();
  return controller;
}

describe('R2 vertical slice (real persistence)', () => {
  it('account → family → child → text memory survives a relaunch', async () => {
    const address = email('slice');
    const { backend: session, device } = await signInWithCode(address);
    const controller = await controllerFor(device);
    expect(controller.current.kind).toBe('authenticated-without-family');

    const familyId = await session.memberships.createFamily({ familyName: 'Kurgu Aile', displayName: 'Ece', relationshipLabel: 'Anne' });
    await session.memberships.setActiveFamily(familyId);
    await controller.refresh();
    expect(controller.current.kind).toBe('authenticated-with-family-without-profile');

    const app = createSupabaseBackend(device.client);
    const requestId = randomUUID();
    const childInput = {
      familyId,
      name: 'Kurgu Bebek',
      birthDate: '2026-10-01' as LocalDate,
      birthTime: null,
      originPregnancyId: null,
      avatarLocalUri: null,
      birthMeasurements: [{ kind: 'weight' as const, canonicalValue: 3200, enteredUnit: 'g' as const }],
    };
    const created = await app.profiles.createChild(childInput, { requestId });
    // A retried create (lost response) returns the same child, not a second one.
    const again = await app.profiles.createChild(childInput, { requestId });
    expect(again.id).toBe(created.id);
    expect((await app.profiles.list(familyId)).children).toHaveLength(1);
    expect(await app.measurements.listForChild(created.id)).toEqual([expect.objectContaining({ canonicalValue: 3200, isBirthMeasurement: true })]);

    await controller.refresh();
    expect(controller.current.kind).toBe('ready');

    const clientRequestId = randomUUID();
    const memoryInput = { familyId, subject: { kind: 'child' as const, childId: created.id }, title: 'İlk gülümseme', body: 'Kurgu bir anı.', eventDate: '2026-11-20' as LocalDate, visibility: 'family' as const, mediaIds: [] };
    const memory = await app.memories.finalize(memoryInput, { clientRequestId });
    const retried = await app.memories.finalize(memoryInput, { clientRequestId });
    expect(retried.id).toBe(memory.id);
    expect(memory.version).toBe(1);

    // Edit with the version we read; a second edit from the same stale version is a conflict.
    const edited = await app.memories.finalize({ ...memoryInput, title: 'İlk gülümseme (düzeltildi)' }, { memoryId: memory.id, clientRequestId: randomUUID(), expectedVersion: 1 });
    expect(edited.version).toBe(2);
    await expect(app.memories.finalize({ ...memoryInput, title: 'Eski sürümden' }, { memoryId: memory.id, clientRequestId: randomUUID(), expectedVersion: 1 })).rejects.toMatchObject({ code: 'validation', message: 'conflict' });
    controller.stop();

    // Relaunch: a new client on the same device storage restores the session from storage.
    const relaunched = appClient(device.storage);
    const controller2 = await controllerFor(relaunched);
    expect(controller2.current).toMatchObject({ kind: 'ready', current: { family: { id: familyId } } });
    const app2 = createSupabaseBackend(relaunched.client);
    const list = await app2.memories.list(familyId);
    expect(list.map((m) => [m.id, m.title, m.version])).toEqual([[memory.id, 'İlk gülümseme (düzeltildi)', 2]]);

    // Sign-out ends this device's session only; the records stay on the server.
    await controller2.signOut();
    expect(controller2.current).toMatchObject({ kind: 'signed-out', reason: 'signed-out' });
    await expect(app2.memories.list(familyId)).rejects.toMatchObject({ code: 'forbidden' }); // signed out: no grants at all
    const [{ n }] = await sql<{ n: string }>(`select count(*) as n from public.memories where family_id = $1`, [familyId]);
    expect(Number(n)).toBe(1);
    controller2.stop();

    // Signing in again on another "device" finds everything.
    const { device: other } = await signInWithCode(address);
    const controller3 = await controllerFor(other);
    expect(controller3.current.kind).toBe('ready');
    expect((await createSupabaseBackend(other.client).memories.get(memory.id)).title).toBe('İlk gülümseme (düzeltildi)');
    controller3.stop();
  });

  it('a pregnancy create retried with the same request id is stored once', async () => {
    const { backend: session, device } = await signInWithCode(email('preg'));
    const familyId = await session.memberships.createFamily({ familyName: 'Kurgu', displayName: 'Ali', relationshipLabel: 'Baba' });
    const app = createSupabaseBackend(device.client);
    const requestId = randomUUID();
    const input = { familyId, nickname: 'Fıstık', clinicianDueDate: '2027-03-01' as LocalDate, lastMenstrualPeriod: null };
    const a = await app.profiles.createPregnancy(input, { requestId });
    const b = await app.profiles.createPregnancy(input, { requestId });
    expect(b.id).toBe(a.id);
    expect((await app.profiles.list(familyId)).pregnancies).toHaveLength(1);
  });

  it('maps server refusals to DataError codes the UI understands', async () => {
    const { device } = await signInWithCode(email('stranger'));
    const app = createSupabaseBackend(device.client);
    // Another family's id: nothing readable, and writes are refused.
    const err = await app.profiles.createPregnancy({ familyId: randomUUID(), nickname: null, clinicianDueDate: '2027-03-01' as LocalDate, lastMenstrualPeriod: null }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DataError);
    expect((err as DataError).code).toBe('forbidden');
    await expect(app.memories.get(randomUUID())).rejects.toMatchObject({ code: 'not-found' });
  });
});
