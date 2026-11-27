import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { borders, colors, layout, radii, spacing } from '../tokens';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  /** Shows a spinner, disables presses (duplicate-submission guard) and announces busy state. */
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const variantStyles = {
  primary: { bg: colors.primary, fg: 'textOnPrimary', border: colors.primary },
  secondary: { bg: colors.surface, fg: 'primary', border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: 'primary', border: 'transparent' },
  danger: { bg: colors.dangerSurface, fg: 'danger', border: colors.danger },
} as const;

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, fullWidth, accessibilityHint, testID }: ButtonProps) {
  const v = variantStyles[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!!inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={colors[v.fg]} /> : icon ? <Icon name={icon} size={20} color={v.fg} /> : null}
        <Text variant="bodyStrong" color={v.fg} align="center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  inactive: { opacity: 0.55 },
});
