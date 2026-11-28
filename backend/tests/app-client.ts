/**
 * The app's own Supabase client setup for integration tests: one storage per
 * simulated device (so a new client restores the session like a relaunch)
 * and real email sign-in codes read from the local mail catcher (Mailpit).
 */
import { createClient } from '@supabase/supabase-js';
import { createSupabaseSessionBackend } from '@/data/providers/supabase/session-backend';
import type { Database } from '@/data/providers/supabase/database.types';

/** A per-"device" key-value store, so a new client can restore the session like a relaunch. */
export function deviceStorage() {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) };
}
export function appClient(storage = deviceStorage()) {
  const client = createClient<Database>(process.env.API_URL!, process.env.PUBLISHABLE_KEY!, {
    auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { client, storage };
}

export async function messageIds(email: string): Promise<string[]> {
  const res = await fetch(`${process.env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  const body = (await res.json()) as { messages: { ID: string }[] | null };
  return (body.messages ?? []).map((m) => m.ID);
}

/** Waits for a code mail that was not in `seen` (so a second request never reads the first code). */
export async function latestCode(email: string, seen: string[] = []): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const fresh = (await messageIds(email)).filter((id) => !seen.includes(id));
    if (fresh.length) {
      const msg = (await (await fetch(`${process.env.MAILPIT_URL}/api/v1/message/${fresh[0]!}`)).json()) as { Text: string; HTML: string };
      const code = /(\d{6})/.exec(msg.Text || msg.HTML)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no code mail for ${email}`);
}

export async function signInWithCode(email: string, device = appClient()) {
  const backend = createSupabaseSessionBackend(device.client);
  const seen = await messageIds(email);
  if (seen.length) await new Promise((r) => setTimeout(r, 1100)); // per-address resend limit (config.toml max_frequency)
  await backend.identity.requestEmailCode(email);
  const code = await latestCode(email, seen);
  await backend.identity.verifyEmailCode(email, code);
  return { backend, device };
}

