import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { t } from '@/content/localization';
import { formatLocalDate, formatMeasurement } from '@/content/localization/format';
import { toDayNumber } from '@/domain/dates/local-date';
import { MeasurementUnit } from '@/domain/measurements/units';
import type { GrowthMeasurement } from '@/domain/model';
import { Text } from '@/ui/primitives';
import { colors, spacing } from '@/ui/tokens';

/**
 * Personal-record chart: plots only the parent's own entries over time.
 * No reference curves, percentiles or interpretation (V1 exclusion).
 */
export function MeasurementChart({ items, unit, kindLabel, width }: { items: GrowthMeasurement[]; unit: MeasurementUnit; kindLabel: string; width: number }) {
  const sorted = [...items].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  if (sorted.length < 2) return null;
  const height = 160;
  const pad = 16;
  const xs = sorted.map((m) => toDayNumber(m.measuredOn));
  const ys = sorted.map((m) => m.canonicalValue);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => pad + ((x - minX) / Math.max(1, maxX - minX)) * (width - pad * 2);
  const sy = (y: number) => height - pad - ((y - minY) / Math.max(1, maxY - minY)) * (height - pad * 2);
  const d = sorted.map((m, i) => `${i === 0 ? 'M' : 'L'}${sx(xs[i]!).toFixed(1)} ${sy(ys[i]!).toFixed(1)}`).join(' ');
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const label = t('measurement.chartA11y', {
    kind: kindLabel,
    count: sorted.length,
    first: `${formatMeasurement(first.canonicalValue, unit)} (${formatLocalDate(first.measuredOn)})`,
    last: `${formatMeasurement(last.canonicalValue, unit)} (${formatLocalDate(last.measuredOn)})`,
  });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.wrap}>
      <Svg width={width} height={height}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={pad} x2={width - pad} y1={pad + f * (height - pad * 2)} y2={pad + f * (height - pad * 2)} stroke={colors.border} strokeWidth={1} />
        ))}
        <Path d={d} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {sorted.map((m, i) => (
          <Circle key={m.id} cx={sx(xs[i]!)} cy={sy(ys[i]!)} r={4.5} fill={colors.surface} stroke={colors.primary} strokeWidth={2} />
        ))}
      </Svg>
      <View style={styles.axis}>
        <Text variant="caption" color="textSecondary">
          {formatLocalDate(first.measuredOn)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatLocalDate(last.measuredOn)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
