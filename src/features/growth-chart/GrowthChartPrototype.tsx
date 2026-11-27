/**
 * Prototype growth chart (weight-for-age). Draws only what buildChartModel
 * returns; colours come from tokens. Percentiles stay hidden while the
 * dataset is unvalidated.
 */
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { DEFAULT_REFERENCE, growthReferences } from '@/content/growth-references';
import { t } from '@/content/localization';
import { formatAge, formatLocalDate } from '@/content/localization/format';
import { childAge } from '@/domain/dates/age';
import type { ReferenceSex } from '@/domain/growth/reference';
import type { GrowthMeasurement } from '@/domain/model';
import type { LocalDate } from '@/domain/dates/local-date';
import { Banner, Card, Chip, Divider, Text, ToggleRow } from '@/ui/primitives';
import { colors, fontFamilies, radii, spacing } from '@/ui/tokens';
import { buildChartModel } from './chart-model';

type Indicator = 'weight' | 'length' | 'head';
const H = 300;
const M = { l: 40, r: 16, t: 12, b: 40 };

export function GrowthChartPrototype({ birthDate, measurements }: { birthDate: LocalDate; measurements: GrowthMeasurement[] }) {
  const [width, setWidth] = useState(0);
  const [indicator, setIndicator] = useState<Indicator>('weight');
  // The parent picks the reference sex explicitly; until then only their own measurements are drawn.
  const [sex, setSex] = useState<ReferenceSex | null>(null);
  const [whoOn, setWhoOn] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const dataset = sex ? growthReferences.find(DEFAULT_REFERENCE, 'weight-for-age', sex) : undefined;
  const model = useMemo(() => buildChartModel({ birthDate, measurements, dataset, sex, sourceOn: whoOn, advanced }), [birthDate, measurements, dataset, sex, whoOn, advanced]);
  const point = model.points.find((p) => p.id === selected) ?? null;
  const measurement = measurements.find((m) => m.id === selected) ?? null;

  const pw = Math.max(0, width - M.l - M.r);
  const ph = H - M.t - M.b;
  const xMax = Math.max(26, Math.ceil((model.points.at(-1)?.ageMonths ?? 24) + 1));
  const yMax = Math.max(16, Math.ceil(Math.max(...model.points.map((p) => p.valueKg), 0) / 2) * 2 + 2);
  const X = (m: number) => M.l + (m / xMax) * pw;
  const Y = (v: number) => M.t + ph - (v / yMax) * ph;
  const poly = (pts: { x: number; y: number }[]) => pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const tickStep = width < 360 ? 6 : 3;

  return (
    <Card>
      <Text variant="heading">{t('growth.title')}</Text>
      <Text color="textSecondary">{t('growth.intro')}</Text>
      <View style={styles.chips}>
        <Chip label={t('growth.indicatorWeight')} selected={indicator === 'weight'} onPress={() => setIndicator('weight')} />
        <Chip label={t('growth.indicatorLength')} selected={indicator === 'length'} onPress={() => setIndicator('length')} />
        <Chip label={t('growth.indicatorHead')} selected={indicator === 'head'} onPress={() => setIndicator('head')} />
      </View>
      <View style={styles.chips}>
        <Chip label={t('growth.sexFemale')} selected={sex === 'female'} onPress={() => setSex('female')} />
        <Chip label={t('growth.sexMale')} selected={sex === 'male'} onPress={() => setSex('male')} />
        <Chip label={t('growth.sexUnspecified')} selected={sex === null} onPress={() => setSex(null)} />
      </View>
      <Text variant="caption" color="textSecondary">{t('growth.sexWhy')}</Text>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: H }} testID="growth-chart">
        {indicator !== 'weight' ? (
          <View style={styles.empty}>
            <Text align="center">{t('growth.noData')}</Text>
            <Text align="center" variant="caption" color="textSecondary">{t('growth.noDataHint')}</Text>
          </View>
        ) : width > 0 ? (
          <Svg width={width} height={H}>
            {Array.from({ length: yMax / 2 + 1 }, (_, i) => i * 2).map((v) => (
              <Line key={`g${v}`} x1={M.l} x2={M.l + pw} y1={Y(v)} y2={Y(v)} stroke={colors.border} strokeWidth={1} />
            ))}
            {Array.from({ length: yMax / 2 + 1 }, (_, i) => i * 2).map((v) => (
              <SvgText key={`y${v}`} x={M.l - 8} y={Y(v) + 4} fontFamily={fontFamilies.text} fontSize={12} fill={colors.textSecondary} textAnchor="end">{String(v)}</SvgText>
            ))}
            {Array.from({ length: Math.floor(xMax / tickStep) + 1 }, (_, i) => i * tickStep).map((m) => (
              <SvgText key={`x${m}`} x={X(m)} y={H - 22} fontFamily={fontFamilies.text} fontSize={12} fill={colors.textSecondary} textAnchor="middle">{String(m)}</SvgText>
            ))}
            <SvgText x={M.l + pw} y={H - 4} fontFamily={fontFamilies.text} fontSize={12} fill={colors.text} textAnchor="end">{t('growth.axisMonths')}</SvgText>
            <SvgText x={M.l} y={M.t + 10} fontFamily={fontFamilies.text} fontSize={12} fill={colors.text}>kg</SvgText>
            {model.referenceMaxMonths !== null && model.referenceMaxMonths < xMax ? (
              <Rect x={X(model.referenceMaxMonths)} y={M.t} width={X(xMax) - X(model.referenceMaxMonths)} height={ph} fill={colors.surfaceMuted} opacity={0.7} />
            ) : null}
            {model.band ? (
              <>
                <Polyline points={poly(model.band.lower)} fill="none" stroke={colors.textSecondary} strokeWidth={1} strokeDasharray="3 4" />
                <Polyline points={poly(model.band.upper)} fill="none" stroke={colors.textSecondary} strokeWidth={1} strokeDasharray="3 4" />
              </>
            ) : null}
            {model.median ? <Polyline points={poly(model.median)} fill="none" stroke={colors.primary} strokeWidth={2} opacity={0.55} /> : null}
            {model.segments.map((s) => (
              <Line key={`s${s.to.id}`} x1={X(s.from.ageMonths)} y1={Y(s.from.valueKg)} x2={X(s.to.ageMonths)} y2={Y(s.to.valueKg)} stroke={colors.danger} strokeWidth={2.5} strokeDasharray={s.gap ? '5 6' : undefined} />
            ))}
            {model.points.map((p) => (
              <Circle key={p.id} cx={X(p.ageMonths)} cy={Y(p.valueKg)} r={selected === p.id ? 8 : 6} fill={colors.danger} stroke={colors.surface} strokeWidth={2.5} />
            ))}
          </Svg>
        ) : null}
        {indicator === 'weight' && width > 0
          ? model.points.map((p) => (
              <Pressable
                key={`hit${p.id}`}
                onPress={() => setSelected(p.id)}
                accessibilityRole="button"
                accessibilityLabel={t('growth.pointLabel', { date: formatLocalDate(p.date), value: `${p.valueKg.toLocaleString('tr-TR')} kg` })}
                style={[styles.hit, { left: X(p.ageMonths) - 22, top: Y(p.valueKg) - 22 }]}
                testID={`growth-point-${p.id}`}
              />
            ))
          : null}
      </View>
      {indicator === 'weight' ? <Text variant="caption" color="textSecondary">{t('growth.legend')}</Text> : null}
      {model.referenceState === 'sex-unspecified' ? <Banner tone="info" message={t('growth.sexUnspecifiedState')} /> : null}

      <Divider />
      <ToggleRow title={t('growth.sourceWho')} subtitle={t('growth.sourceWhoSub')} value={whoOn} onValueChange={setWhoOn} />
      <ToggleRow title={t('growth.sourceCdc')} subtitle={t('growth.sourceCdcSub')} value={false} onValueChange={() => undefined} disabled />
      <ToggleRow title={t('growth.advanced')} subtitle={t('growth.advancedSub')} value={advanced} onValueChange={setAdvanced} />
      <Text variant="caption" color="textSecondary">{t('growth.aap')}</Text>

      <View style={styles.detail} testID="growth-detail">
        {point && measurement ? (
          <>
            <Text variant="bodyStrong">{formatLocalDate(point.date)}</Text>
            <Row label={t('growth.age')} value={ageText(birthDate, point.date)} />
            <Row label={t('growth.value')} value={`${point.valueKg.toLocaleString('tr-TR')} kg`} />
            <Row label={t('growth.method')} value={measurement.isBirthMeasurement ? t('growth.methodBirth') : t('growth.methodUnknown')} />
            <Row label={t('growth.reference')} value={sex && model.referenceState === 'shown' && dataset ? `${dataset.publisher} 2006, ${sex === 'female' ? t('growth.sexFemale') : t('growth.sexMale')}` : t('growth.noReference')} />
            <Row label={t('growth.percentile')} value={!point.inReferenceRange ? t('growth.outOfRange') : t('growth.percentileOff')} />
          </>
        ) : (
          <Text color="textSecondary">{t('growth.tapHint')}</Text>
        )}
      </View>
    </Card>
  );
}

function ageText(birth: LocalDate, on: LocalDate): string {
  const age = childAge(birth, on);
  return age ? formatAge(age) : '';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text color="textSecondary" style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  hit: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  detail: { backgroundColor: colors.surfaceCalm, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  rowLabel: { width: 96 },
  rowValue: { flex: 1 },
});
