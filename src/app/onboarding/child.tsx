import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { ChildDraftErrors, ChildForm, emptyChildDraft, useCreateChild, validateChildDraft } from '@/features/children';
import { useProfileOnboarding } from '@/features/onboarding';
import { newRequestId } from '@/infrastructure/ids/request-id';
import { useToday } from '@/features/shared/use-today';
import { Banner, Button, Screen } from '@/ui/primitives';

export default function ChildOnboarding() {
  const today = useToday();
  const onboarding = useProfileOnboarding();
  const create = useCreateChild();
  // One id per form: a retried submit after a lost response never creates a second child.
  const [requestId] = useState(newRequestId);
  const [draft, setDraft] = useState(() => emptyChildDraft());
  const [errors, setErrors] = useState<ChildDraftErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit() {
    const { errors: errs, input } = validateChildDraft(draft, today);
    setErrors(errs);
    if (!input) return;
    try {
      const { familyId, userId } = await onboarding.ensureFamily();
      const child = await create.mutateAsync({ ...input, familyId, originPregnancyId: null, requestId });
      await onboarding.finish(userId, { kind: 'child', childId: child.id });
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
