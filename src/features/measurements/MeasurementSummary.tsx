import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate, formatMeasurement } from '@/content/localization/format';
import { defaultUnit } from '@/domain/measurements/units';
import type { GrowthMeasurement, MeasurementKind } from '@/domain/model';
import { Card, Text } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export const KIND_LABEL: Record<MeasurementKind, () => string> = {
  weight: () => t('measurement.weight'),
  length: () => t('measurement.length'),
  'head-circumference': () => t('measurement.head'),
};

/** Latest value per kind. Plain values, no interpretation. */
export function MeasurementSummary({ items, onPress }: { items: GrowthMeasurement[]; onPress?: () => void }) {
  const latest = (['weight', 'length', 'head-circumference'] as const)
    .map((kind) => items.filter((m) => m.kind === kind).sort((a, b) => b.measuredOn.localeCompare(a.measuredOn))[0])
    .filter((m): m is GrowthMeasurement => !!m);
  if (!latest.length) return null;
  return (
    <Card tone="surfaceAccent" onPress={onPress} accessibilityLabel={latest.map((m) => `${KIND_LABEL[m.kind]()} ${formatMeasurement(m.canonicalValue, defaultUnit(m.kind, 'metric'))}`).join(', ')}>
      <View style={styles.row}>
        {latest.map((m) => (
          <View key={m.id} style={styles.cell}>
            <Text variant="overline" color="textSecondary">
              {KIND_LABEL[m.kind]()}
            </Text>
            <Text variant="heading">{formatMeasurement(m.canonicalValue, defaultUnit(m.kind, 'metric'))}</Text>
            <Text variant="caption" color="textSecondary">
              {formatLocalDate(m.measuredOn, { withYear: false })}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  cell: { minWidth: 88, flexGrow: 1, gap: 2 },
});
