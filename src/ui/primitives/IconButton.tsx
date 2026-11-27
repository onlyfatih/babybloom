import { Pressable, StyleSheet } from 'react-native';
import { colors, ColorRole, layout, radii } from '../tokens';
import { Icon, IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls must have a spoken label. */
  accessibilityLabel: string;
  onPress: () => void;
  color?: ColorRole;
  tone?: 'plain' | 'filled' | 'soft';
  disabled?: boolean;
  testID?: string;
}

export function IconButton({ icon, accessibilityLabel, onPress, color, tone = 'plain', disabled, testID }: IconButtonProps) {
  const bg = tone === 'filled' ? colors.primary : tone === 'soft' ? colors.surfaceAccent : 'transparent';
  const fg: ColorRole = color ?? (tone === 'filled' ? 'textOnPrimary' : 'primary');
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.base, { backgroundColor: bg }, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} color={fg} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
