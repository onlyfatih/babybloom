import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { ChildDraftErrors, ChildForm, emptyChildDraft, useCreateChild, validateChildDraft } from '@/features/children';
import { useEnsureFamily } from '@/features/onboarding';
import { useSelectProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { Banner, Button, Screen } from '@/ui/primitives';

export default function ChildOnboarding() {
  const today = useToday();
  const ensureFamily = useEnsureFamily();
  const create = useCreateChild();
  const select = useSelectProfile();
  const [draft, setDraft] = useState(() => emptyChildDraft());
  const [errors, setErrors] = useState<ChildDraftErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit() {
    const { errors: errs, input } = validateChildDraft(draft, today);
    setErrors(errs);
    if (!input) return;
    try {
      const session = await ensureFamily(t('onboarding.defaultRelationship'));
      const child = await create.mutateAsync({ ...input, familyId: session.family.id, originPregnancyId: null });
      await select.mutateAsync({ kind: 'child', childId: child.id });
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      setSubmitError(errorMessage(e));
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('onboarding.createProfile')} onPress={submit} fullWidth loading={create.isPending} testID="create-child" />}>
      <Stack.Screen options={{ title: t('onboarding.childTitle') }} />
      <ChildForm draft={draft} onChange={setDraft} errors={errors} today={today} />
      {submitError ? <Banner tone="danger" message={submitError} /> : null}
    </Screen>
  );
}
