export { colors, type ColorRole } from './colors';
export { typography, fontFamilies, type TextVariant } from './typography';

/** 4-pt spacing scale. */
export const spacing = { none: 0, xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export type SpacingToken = keyof typeof spacing;

export const radii = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 } as const;

export const borders = { hairline: 1, thick: 2, focus: 3 } as const;

export const elevation = {
  none: {},
  card: { shadowColor: '#243B36', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  floating: { shadowColor: '#243B36', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

/** Durations in ms. Components must check reduced motion (useReducedMotion) before animating. */
export const motion = { fast: 120, normal: 220, slow: 360 } as const;

export const layout = {
  /** Readable column on tablets / web preview. */
  contentMaxWidth: 640,
  screenPadding: 20,
  /** Minimum touch target (Apple HIG 44pt, Material 48dp). */
  minTouchTarget: 48,
  tabBarHeight: 64,
} as const;
