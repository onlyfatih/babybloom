import { Pressable, StyleSheet, View } from 'react-native';
import { colors, layout, radii, spacing } from '../tokens';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, accessibilityLabel }: { segments: Segment<T>[]; value: T; onChange: (v: T) => void; accessibilityLabel: string }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(s.value)}
            style={[styles.segment, active && styles.active]}
          >
            <Text variant={active ? 'bodyStrong' : 'body'} color={active ? 'text' : 'textSecondary'} align="center" numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, padding: spacing.xs, gap: spacing.xs },
  segment: { flex: 1, minHeight: layout.minTouchTarget - 8, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  active: { backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
});
