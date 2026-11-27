/**
 * Pregnancy screen hierarchy for one week: week/day, artwork, sourced
 * comparison, approximate length with its convention, notes, source.
 */
import { Linking, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { comparisonForWeek, COMPARISON_SOURCE, WeeklyComparison } from '@/content/pregnancy/weekly-comparisons';
import { Banner, Card, Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';
import { WeekIllustration } from './WeekIllustration';

export function comparisonSentence(c: WeeklyComparison): string {
  const key = c.basis === 'length' ? 'comparison.length' : c.basis === 'size-and-weight' ? 'comparison.sizeAndWeight' : 'comparison.size';
  return t(key, { object: c.objectTr });
}

export function lengthText(c: WeeklyComparison): string | null {
  if (!c.length) return null;
  const value = c.length.value.toLocaleString('tr-TR');
  const key = c.length.convention === 'crown-rump' ? 'comparison.lengthCrownRump' : c.length.convention === 'crown-heel' ? 'comparison.lengthCrownHeel' : 'comparison.lengthUnstated';
  return t(key, { value, unit: c.length.unit });
}

export function WeekComparisonCard({ week, days, artSize, animate }: { week: number; days: number; artSize: number; animate: boolean }) {
  const c = comparisonForWeek(week);
  return (
    <Card>
      <View style={styles.hero}>
        <Text variant="display">
          {`${week} hafta `}
          <Text variant="subheading" color="textSecondary">{`${days} gün`}</Text>
        </Text>
        {c ? (
          <>
            <WeekIllustration illustrationId={c.illustrationId} size={artSize} animate={animate} />
            <Text variant="heading">{comparisonSentence(c)}</Text>
            {lengthText(c) ? <Text color="textSecondary">{lengthText(c)!}</Text> : null}
          </>
        ) : (
          <Text color="textSecondary">{t('comparison.none')}</Text>
        )}
      </View>
      {c?.week === 20 ? <Banner tone="info" message={t('comparison.conventionChange')} /> : null}
      {c ? <Text variant="caption" color="textSecondary">{t('comparison.notMeasurement')}</Text> : null}
      <Text variant="caption" color="warning">{t('comparison.draft')}</Text>
      {c ? (
        <Text variant="caption" color="textLink" accessibilityRole="link" onPress={() => Linking.openURL(COMPARISON_SOURCE.baseUrl + c.sourcePath)}>
          {t('comparison.source', { week: c.week, date: '27.11.2026' })}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.surfaceWarm, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
});
