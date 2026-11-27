import { PixelRatio, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, elevation, radii, spacing } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/** Prominent contextual "Ekle" action. Has a visible text label, not just a plus. */
export function Fab({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  const { width } = useWindowDimensions();
  // On narrow screens or with large system text the label collapses to an icon (the spoken label stays).
  const compact = width < 360 || PixelRatio.getFontScale() > 1.3;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.fab, compact && styles.compact, elevation.floating, pressed && { transform: [{ scale: 0.97 }] }]}
      testID="fab-add"
    >
      <Icon name="add" size={24} color="textOnPrimary" />
      {compact ? null : (
        <Text variant="bodyStrong" color="textOnPrimary">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  compact: { width: 56, paddingHorizontal: 0, justifyContent: 'center' },
});
