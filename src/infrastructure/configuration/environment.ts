/**
 * App environment, derived from the validated configuration in app-config.ts.
 * An invalid configuration counts as production (strictest flags).
 */
import { effectiveEnv, type AppEnv } from './app-config';

export const appEnvironment: AppEnv = effectiveEnv;
export const appVersion = '0.1.0';

/** Design-review aid only: multiplies text sizes to preview large text in the web build. Never set in production. */
export const previewFontScale = Number(process.env.EXPO_PUBLIC_PREVIEW_FONT_SCALE ?? 1) || 1;
