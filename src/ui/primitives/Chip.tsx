import { Pressable, StyleSheet } from 'react-native';
import { borders, colors, radii, spacing } from '../tokens';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}

/** Selection is shown by fill, border AND a check icon, not color alone. */
export function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      hitSlop={6}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && { opacity: 0.8 }]}
    >
      {selected ? <Icon name="checkmark" size={16} color="textOnPrimary" /> : icon ? <Icon name={icon} size={16} color="primary" /> : null}
      <Text variant="label" color={selected ? 'textOnPrimary' : 'text'} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
