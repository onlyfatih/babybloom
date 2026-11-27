import type { TextStyle } from 'react-native';

/**
 * Font families are loaded in src/app/_layout.tsx (Fraunces for display, Inter for text).
 * Both cover Turkish characters (ç ğ ı İ ö ş ü).
 */
export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  text: 'Inter_400Regular',
  textMedium: 'Inter_500Medium',
  textSemiBold: 'Inter_600SemiBold',
} as const;

export type TextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'callout' | 'caption' | 'label' | 'overline';

/**
 * maxFontSizeMultiplier caps Dynamic Type growth for large display text only,
 * so body text scales freely with the system setting.
 */
export const typography: Record<TextVariant, TextStyle & { maxFontSizeMultiplier?: number }> = {
  display: { fontFamily: fontFamilies.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.4, maxFontSizeMultiplier: 1.4 },
  title: { fontFamily: fontFamilies.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.2, maxFontSizeMultiplier: 1.5 },
  heading: { fontFamily: fontFamilies.display, fontSize: 20, lineHeight: 26, maxFontSizeMultiplier: 1.7 },
  subheading: { fontFamily: fontFamilies.textSemiBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamilies.text, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamilies.textSemiBold, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fontFamilies.displayItalic, fontSize: 17, lineHeight: 25 },
  caption: { fontFamily: fontFamilies.text, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamilies.textMedium, fontSize: 14, lineHeight: 20 },
  overline: { fontFamily: fontFamilies.textSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
};
