/**
 * Validated runtime configuration (R1). Every value here is PUBLIC: it is
 * embedded in the app bundle. Privileged keys (Supabase secret / service-role)
 * must never appear in EXPO_PUBLIC_* variables; parseConfig rejects them.
 *
 * Rules
 * - production: backend must be 'supabase' with a valid https URL and a
 *   publishable (client) key. Anything else is a configuration error. It never
 *   falls back to demo.
 * - demo: local demo provider only, visibly labelled, fictional data.
 * - development: either provider; supabase needs a URL and key (http allowed
 *   for the local stack).
 */

export type AppEnv = 'demo' | 'development' | 'production';
export type BackendKind = 'demo' | 'supabase';
export type BuildVariant = 'development' | 'preview' | 'production';

export interface AppConfig {
  env: AppEnv;
  backend: BackendKind;
  buildVariant: BuildVariant;
  supabase: { url: string; publishableKey: string } | null;
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; errors: string[] };

export interface RawConfig {
  EXPO_PUBLIC_APP_ENV?: string;
  EXPO_PUBLIC_BACKEND?: string;
  EXPO_PUBLIC_BUILD_VARIANT?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

const ENVS: AppEnv[] = ['demo', 'development', 'production'];
const BACKENDS: BackendKind[] = ['demo', 'supabase'];
const VARIANTS: BuildVariant[] = ['development', 'preview', 'production'];

/** True for keys that must never ship in a client: new secret keys and legacy service-role JWTs. */
export function isPrivilegedKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(globalThis.atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))) as { role?: string };
      return json.role !== 'anon';
    } catch {
      return true; // unreadable JWT-shaped key: refuse rather than guess
    }
  }
  return false;
}

export function parseConfig(raw: RawConfig): ConfigResult {
  const errors: string[] = [];
  // 'prototype' is the pre-R1 name of the demo environment.
  const envRaw = (raw.EXPO_PUBLIC_APP_ENV ?? '').trim() || 'demo';
  const env = (envRaw === 'prototype' ? 'demo' : envRaw) as AppEnv;
  if (!ENVS.includes(env)) errors.push(`EXPO_PUBLIC_APP_ENV must be one of ${ENVS.join(', ')} (got "${envRaw}")`);

  const backendRaw = (raw.EXPO_PUBLIC_BACKEND ?? '').trim();
  const backend = (backendRaw || (env === 'demo' ? 'demo' : '')) as BackendKind;
  if (!BACKENDS.includes(backend)) errors.push(`EXPO_PUBLIC_BACKEND must be one of ${BACKENDS.join(', ')}`);

  const variantRaw = (raw.EXPO_PUBLIC_BUILD_VARIANT ?? '').trim() || (env === 'production' ? 'production' : 'development');
  const buildVariant = variantRaw as BuildVariant;
  if (!VARIANTS.includes(buildVariant)) errors.push(`EXPO_PUBLIC_BUILD_VARIANT must be one of ${VARIANTS.join(', ')}`);

  if (env === 'production' && backend !== 'supabase') errors.push('production requires EXPO_PUBLIC_BACKEND=supabase');
  if (env === 'demo' && backend !== 'demo') errors.push('the demo environment only runs the demo backend');
  if (env !== 'production' && buildVariant === 'production') errors.push('a production build variant requires EXPO_PUBLIC_APP_ENV=production');

  let supabase: AppConfig['supabase'] = null;
  if (backend === 'supabase') {
    const url = (raw.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
    const key = (raw.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      errors.push('EXPO_PUBLIC_SUPABASE_URL is missing or not a URL');
    }
    if (parsed && env === 'production' && parsed.protocol !== 'https:') errors.push('EXPO_PUBLIC_SUPABASE_URL must use https in production');
    if (parsed && !['https:', 'http:'].includes(parsed.protocol)) errors.push('EXPO_PUBLIC_SUPABASE_URL must be http(s)');
    if (!key) errors.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing');
    else if (isPrivilegedKey(key)) errors.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is a privileged key; use the publishable (client) key');
    if (!errors.length) supabase = { url: url.replace(/\/+$/, ''), publishableKey: key };
  }

  return errors.length ? { ok: false, errors } : { ok: true, config: { env, backend, buildVariant, supabase } };
}

// EXPO_PUBLIC_* must be read with static member access so Expo inlines them.
export const configResult: ConfigResult = parseConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_BACKEND: process.env.EXPO_PUBLIC_BACKEND,
  EXPO_PUBLIC_BUILD_VARIANT: process.env.EXPO_PUBLIC_BUILD_VARIANT,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/** The environment to use for UI decisions. An invalid config is treated as production: strictest. */
export const effectiveEnv: AppEnv = configResult.ok ? configResult.config.env : 'production';
