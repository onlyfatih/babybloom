import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '@/content/localization';
import { illustrationForWeek } from '@/content/illustrations';
import type { Pregnancy } from '@/domain/model';
import { showsPregnancyContent } from '@/domain/pregnancy/lifecycle';
import { Card, Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';
import type { PregnancyView } from './gestation-labels';

export function PregnancyWeekHero({ pregnancy, view, onPress }: { pregnancy: Pregnancy; view: PregnancyView; onPress?: () => void }) {
  const { width } = useWindowDimensions();
  const week = view.age?.contentWeek ?? null;
  const showArt = showsPregnancyContent(pregnancy) && view.age && view.age.phase !== 'beyond-display';
  const illustration = showArt ? illustrationForWeek(Math.max(4, Math.min(42, view.age!.weeks))) : null;
  const sourceLabel = view.source === 'clinician-due-date' ? t('pregnancy.sourceDueDate') : view.source === 'last-menstrual-period' ? t('pregnancy.sourceLmp') : null;

  return (
    <Card tone="surfaceWarm" onPress={week !== null ? onPress : undefined} accessibilityLabel={[t('pregnancy.estimatedLabel'), view.primary, view.secondary, sourceLabel].filter(Boolean).join(', ')} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.estimatePill}>
          <Text variant="overline" color="text">
            {t('pregnancy.estimatedLabel')}
          </Text>
        </View>
        {illustration ? (
          <View accessible accessibilityRole="image" accessibilityLabel={illustration.accessibilityLabel}>
            {illustration.render(width < 360 ? 72 : 96)}
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <View style={styles.text}>
          {view.age && (view.age.phase === 'in-range' || view.age.phase === 'past-due' || view.age.phase === 'before-content') ? (
            <View style={styles.big} accessible={false}>
              <Text variant="display">{t('pregnancy.weeksBig', { weeks: view.age.weeks })}</Text>
              <Text variant="heading" color="textSecondary">
                {t('pregnancy.daysSmall', { days: view.age.days })}
              </Text>
            </View>
          ) : (
            <Text variant="heading">{view.primary}</Text>
          )}
          {view.secondary ? <Text variant="bodyStrong">{view.secondary}</Text> : null}
          {sourceLabel ? (
            <Text variant="caption" color="textSecondary">
              {sourceLabel}
            </Text>
          ) : null}
        </View>
      </View>
      {view.note ? (
        <View style={styles.note}>
          <Text variant="caption">{view.note}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.xl, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  estimatePill: { flexShrink: 1, alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  note: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
});
