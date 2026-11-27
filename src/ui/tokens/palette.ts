/**
 * Raw palette. Screens never import this file; they use semantic `colors`.
 * To re-theme the app, change values here or the mapping in colors.ts.
 * Contrast ratios are asserted in __tests__/ui/contrast-test.ts.
 */
export const palette = {
  cream50: '#FFFDF9',
  cream100: '#FAF7F2',
  cream200: '#F2ECE2',
  sand300: '#DDD5C8',
  forest900: '#243B36',
  forest700: '#426B5B',
  forest600: '#4F7D6B',
  sage500: '#5B6E68',
  sage400: '#7A8A85',
  sage100: '#E8EFE8',
  apricot300: '#F2C7A8',
  apricot100: '#FBEADD',
  lavender200: '#E6E0F2',
  lavender600: '#5E5288',
  clay700: '#9A3D24',
  clay100: '#F7E3DC',
  honey700: '#7A5A12',
  honey100: '#F8EDCF',
  white: '#FFFFFF',
  black: '#000000',
} as const;
