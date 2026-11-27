import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { colors, ColorRole } from '../tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Decorative by default; pair with visible text or an accessibilityLabel on the parent. */
export function Icon({ name, size = 22, color = 'text' }: { name: IconName; size?: number; color?: ColorRole }) {
  return <Ionicons name={name} size={size} color={colors[color]} accessible={false} importantForAccessibility="no" />;
}
