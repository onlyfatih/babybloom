/**
 * App environment. Set EXPO_PUBLIC_APP_ENV at build time (EAS profiles in P5).
 * Only public, non-secret values may use EXPO_PUBLIC_*; they are embedded in the app bundle.
 */
type AppEnvironment = 'prototype' | 'development' | 'production';

const raw = process.env.EXPO_PUBLIC_APP_ENV;
export const appEnvironment: AppEnvironment = raw === 'production' || raw === 'development' ? raw : 'prototype';
export const appVersion = '0.1.0';

/** Design-review aid only: multiplies text sizes to preview large text in the web build. Never set in production. */
export const previewFontScale = Number(process.env.EXPO_PUBLIC_PREVIEW_FONT_SCALE ?? 1) || 1;
