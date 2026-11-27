import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { previewFontScale } from '@/infrastructure/configuration/environment';
import { colors, ColorRole, typography, TextVariant } from '../tokens';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorRole;
  align?: 'left' | 'center' | 'right';
}

/** All app text goes through this primitive so typography and Dynamic Type stay consistent. */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const { maxFontSizeMultiplier, textTransform, ...base } = typography[variant];
  const variantStyle = previewFontScale === 1 ? base : { ...base, fontSize: (base.fontSize ?? 16) * previewFontScale, lineHeight: (base.lineHeight ?? 24) * previewFontScale };
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  // CSS/RN textTransform is not reliably Turkish-aware (i → İ). Uppercase in JS with the tr locale.
  const children = textTransform === 'uppercase' && typeof rest.children === 'string' ? rest.children.toLocaleUpperCase('tr-TR') : rest.children;
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : rest.accessibilityRole}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[variantStyle, { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
