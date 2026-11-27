import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import { borders, colors, ColorRole, elevation, radii, spacing } from '../tokens';

export interface CardProps extends ViewProps {
  tone?: Extract<ColorRole, 'surface' | 'surfaceAccent' | 'surfaceWarm' | 'surfaceCalm' | 'surfaceMuted'>;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
}

export function Card({ tone = 'surface', onPress, padded = true, style, children, accessibilityLabel, ...rest }: CardProps) {
  const base = [styles.card, { backgroundColor: colors[tone] }, padded && styles.padded, tone === 'surface' && elevation.card, style];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.9 }]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.border, overflow: 'hidden' },
  padded: { padding: spacing.lg, gap: spacing.sm },
});
