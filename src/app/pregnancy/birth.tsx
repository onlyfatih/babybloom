import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { MAX_CHILDREN_PER_BIRTH } from '@/domain/pregnancy/lifecycle';
import { ChildDraft, ChildDraftErrors, ChildForm, emptyChildDraft, validateChildDraft } from '@/features/children';
import { useRecordBirth } from '@/features/pregnancy';
import { useRequiredSession, useSelectedProfile, useSelectProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader, Text } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

/** Explicit, parent-confirmed transition. Never triggered by the due date. Supports multiples. */
export default function RecordBirth() {
  const session = useRequiredSession();
  const today = useToday();
  const { selected } = useSelectedProfile();
  const record = useRecordBirth(session.family.id);
  const select = useSelectProfile();
  const [babies, setBabies] = useState<ChildDraft[]>(() => [emptyChildDraft(today)]);
  const [errors, setErrors] = useState<Record<string, ChildDraftErrors>>({});
  const [error, setError] = useState<string | null>(null);
  if (selected?.kind !== 'pregnancy' || selected.pregnancy.status !== 'active') return <Screen><EmptyState title={t('pregnancy.birthTitle')} /></Screen>;
  const pregnancy = selected.pregnancy;

  async function submit() {
    const results = babies.map((b) => validateChildDraft(b, today));
    setErrors(Object.fromEntries(babies.map((b, i) => [b.key, results[i]!.errors])));
    if (results.some((r) => !r.input)) return;
    try {
      const children = await record.mutateAsync({ pregnancyId: pregnancy.id, children: results.map((r) => r.input!) });
      await select.mutateAsync({ kind: 'child', childId: children[0]!.id });
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('pregnancy.birthConfirm')} onPress={submit} fullWidth loading={record.isPending} />}>
      <Stack.Screen options={{ title: t('pregnancy.birthTitle') }} />
      <Card tone="surfaceWarm">
        <Text>{t('pregnancy.birthIntro')}</Text>
      </Card>
      {babies.map((b, i) => (
        <View key={b.key} style={{ gap: spacing.md }}>
          {babies.length > 1 ? <SectionHeader title={t('pregnancy.babyN', { n: i + 1 })} actionLabel={t('pregnancy.removeBaby')} onAction={() => setBabies((all) => all.filter((x) => x.key !== b.key))} /> : null}
          <ChildForm draft={b} onChange={(d) => setBabies((all) => all.map((x) => (x.key === b.key ? d : x)))} errors={errors[b.key] ?? {}} today={today} />
        </View>
      ))}
      {babies.length < MAX_CHILDREN_PER_BIRTH ? <Button label={t('pregnancy.addAnotherBaby')} variant="secondary" icon="add" onPress={() => setBabies((all) => [...all, emptyChildDraft(all[0]?.birthDate ?? today)])} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
