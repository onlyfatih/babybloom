/**
 * Test harness for the local Supabase stack. Values come from
 * `npx supabase status -o env --workdir backend` (see npm run test:db).
 * The secret key is used ONLY to create and clean up test identities and to
 * set up states a client cannot create (e.g. an expired invitation). It is
 * never used to prove that a client is allowed to do something.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { Client as Pg } from 'pg';

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set. Run: npm run test:db`);
  return v;
};

export const API_URL = () => env('API_URL');
const PUBLISHABLE = () => env('PUBLISHABLE_KEY');
const SECRET = () => env('SECRET_KEY');
export const DB_URL = () => env('DB_URL');

export function anonClient(): SupabaseClient {
  return createClient(API_URL(), PUBLISHABLE(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

const created: string[] = [];

/** A fresh, independently signed-in user with its own client and session. */
export async function newUser(label: string): Promise<TestUser> {
  const admin = createClient(API_URL(), SECRET(), { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, client };
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const pg = new Pg({ connectionString: DB_URL() });
  await pg.connect();
  try {
    return (await pg.query(text, params)).rows as T[];
  } finally {
    await pg.end();
  }
}

/** Unwraps a PostgREST/RPC result; throws the error message (our stable codes). */
export async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

/** Resolves the error message of a call that must fail (or 'no-error'). */
export async function failure(p: PromiseLike<{ error: { message: string } | null }>): Promise<string> {
  const { error } = await p;
  return error ? error.message : 'no-error';
}

export async function familyOf(u: TestUser, name = 'Test ailesi'): Promise<string> {
  return ok(u.client.rpc('create_family', { p_family_name: name, p_display_name: 'Kurgu', p_relationship_label: 'Ebeveyn' }));
}

export async function invite(owner: TestUser, familyId: string): Promise<string> {
  const rows = await ok(owner.client.rpc('create_invitation', { p_family_id: familyId, p_relationship_label: 'Aile üyesi' }));
  return (rows as { token: string }[])[0]!.token;
}

export async function join(u: TestUser, token: string): Promise<{ result: string; family_id: string | null }> {
  const rows = await ok(u.client.rpc('accept_invitation', { p_token: token, p_display_name: 'Kurgu üye' }));
  return (rows as { result: string; family_id: string | null }[])[0]!;
}

export async function textMemory(u: TestUser, familyId: string, childId: string, visibility: 'family' | 'private', title = 'Anı'): Promise<string> {
  return ok(
    u.client.rpc('finalize_memory', {
      p_family_id: familyId, p_memory_id: null, p_client_request_id: randomUUID(), p_pregnancy_id: null, p_child_id: childId,
      p_title: title, p_body: null, p_event_date: '2026-11-01', p_visibility: visibility, p_media_ids: [], p_expected_version: null,
    }),
  );
}

export async function child(u: TestUser, familyId: string, name = 'Kurgu Bebek'): Promise<string> {
  const row = await ok(u.client.from('children').insert({ family_id: familyId, name, birth_date: '2026-06-01', created_by: u.id }).select('id').single());
  return (row as { id: string }).id;
}

export async function cleanup(): Promise<void> {
  if (!created.length) return;
  // Test data only: remove rows owned by test users, then the users.
  await sql(`delete from public.families where created_by = any($1::uuid[])`, [created]);
  const admin = createClient(API_URL(), SECRET(), { auth: { persistSession: false } });
  for (const id of created.splice(0)) await admin.auth.admin.deleteUser(id);
}

export const uuid = randomUUID;
