import { palette } from './palette';

/** Semantic color roles. Add roles here; do not hardcode hex values in screens. */
export const colors = {
  background: palette.cream100,
  surface: palette.cream50,
  surfaceMuted: palette.cream200,
  surfaceAccent: palette.sage100,
  surfaceWarm: palette.apricot100,
  surfaceCalm: palette.lavender200,

  text: palette.forest900,
  textSecondary: palette.sage500,
  textOnPrimary: palette.white,
  textLink: palette.forest700,

  primary: palette.forest700,
  primaryPressed: palette.forest900,
  accentWarm: palette.apricot300,
  accentCalm: palette.lavender600,

  border: palette.sand300,
  /** Form-control outlines need >= 3:1 against background (WCAG 1.4.11). */
  borderStrong: palette.sage400,
  focus: palette.forest700,

  danger: palette.clay700,
  dangerSurface: palette.clay100,
  warning: palette.honey700,
  warningSurface: palette.honey100,
  success: palette.forest700,
  successSurface: palette.sage100,

  overlay: 'rgba(36, 59, 54, 0.45)',
  shadow: palette.forest900,
} as const;

export type ColorRole = keyof typeof colors;
