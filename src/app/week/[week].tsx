import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { getLocale, t } from '@/content/localization';
import { illustrationFor, illustrationForWeek } from '@/content/illustrations';
import { weeklyContent } from '@/content/pregnancy';
import { CONTENT_FIRST_WEEK, CONTENT_LAST_WEEK } from '@/domain/pregnancy/gestation';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader, Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';

export default function WeekDetail() {
  const params = useLocalSearchParams<{ week: string }>();
  const week = Math.max(CONTENT_FIRST_WEEK, Math.min(CONTENT_LAST_WEEK, Number(params.week) || CONTENT_FIRST_WEEK));
  const article = weeklyContent.getWeek(getLocale(), week);
  const illustration = article ? illustrationFor(article.illustrationId) : illustrationForWeek(week);

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <View style={styles.nav}>
          <View style={styles.navItem}>
          <Button fullWidth label={t('week.previousShort', { week: week - 1 })} accessibilityHint={t('week.previous')} variant="secondary" icon="chevron-back" disabled={week <= CONTENT_FIRST_WEEK} onPress={() => router.setParams({ week: String(week - 1) })} />
          </View>
          <View style={styles.navItem}>
          <Button fullWidth label={t('week.nextShort', { week: week + 1 })} accessibilityHint={t('week.next')} variant="secondary" icon="chevron-forward" disabled={week >= CONTENT_LAST_WEEK} onPress={() => router.setParams({ week: String(week + 1) })} />
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ title: t('week.title', { week }) }} />
      <View style={styles.art} accessible accessibilityRole="image" accessibilityLabel={illustration.accessibilityLabel}>
        {illustration.render(200)}
      </View>
      {!article ? (
        <EmptyState icon="hourglass-outline" title={t('week.preparing')} body={t('week.preparingHint', { week })} />
      ) : (
        <>
          {article.isDemo ? <Banner tone="warning" message={t('week.demoNoticeLong')} /> : null}
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" color="primary">
              {t('week.title', { week })}
            </Text>
            <Text variant="title">{article.title}</Text>
            <Text variant="callout" color="textSecondary">
              {article.summary}
            </Text>
          </View>
          {article.sizeAnalogy ? (
            <Card tone="surfaceWarm">
              <Text variant="overline">{t('week.sizeAnalogy')}</Text>
              <Text variant="heading">≈ {article.sizeAnalogy.objectLabel}</Text>
              <Text variant="caption">{t('week.sizeAnalogyNote')}</Text>
            </Card>
          ) : null}
          <SectionHeader title={t('week.baby')} />
          {article.babyDevelopment.map((p, i) => (
            <Text key={`b${i}`}>{p}</Text>
          ))}
          <SectionHeader title={t('week.parent')} />
          {article.parentExperience.map((p, i) => (
            <Text key={`p${i}`}>{p}</Text>
          ))}
          <View style={styles.meta}>
            <Text variant="subheading">{t('week.sources')}</Text>
            {article.sources.length ? (
              article.sources.map((s) => (
                <Text key={s.url} variant="caption">
                  {s.publisher}: {s.title}
                </Text>
              ))
            ) : (
              <Text variant="caption" color="textSecondary">
                {t('week.noSources')}
              </Text>
            )}
            {article.reviewedOn ? <Text variant="caption">{t('week.reviewedOn', { date: article.reviewedOn })}</Text> : null}
            <Text variant="caption" color="textSecondary">
              {t('week.contentVersion', { version: article.contentVersion })}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingVertical: spacing.sm },
  nav: { flexDirection: 'row', gap: spacing.md },
  navItem: { flex: 1 },
  meta: { gap: spacing.xs, padding: spacing.lg, backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
});
