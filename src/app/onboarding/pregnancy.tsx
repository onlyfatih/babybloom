import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { LocalDate } from '@/domain/dates/local-date';
import { validateDating } from '@/domain/pregnancy/gestation';
import { useProfileOnboarding } from '@/features/onboarding';
import { useCreatePregnancy } from '@/features/pregnancy';
import { DatingMode, datingErrorMessage, PregnancyDatingForm } from '@/features/pregnancy/PregnancyDatingForm';
import { useToday } from '@/features/shared/use-today';
import { newRequestId } from '@/infrastructure/ids/request-id';
import { Banner, Button, Screen, TextField } from '@/ui/primitives';

export default function PregnancyOnboarding() {
  const today = useToday();
  const onboarding = useProfileOnboarding();
  const create = useCreatePregnancy();
  const [requestId] = useState(newRequestId);
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<DatingMode>('due-date');
  const [dueDate, setDueDate] = useState<LocalDate | null>(null);
  const [lmp, setLmp] = useState<LocalDate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const input = mode === 'due-date' ? { clinicianDueDate: dueDate, lastMenstrualPeriod: null } : { clinicianDueDate: null, lastMenstrualPeriod: lmp };
  const validation = validateDating(input, today);
  const fieldError = submitted && validation ? datingErrorMessage[validation] : validation && validation !== 'missing' ? datingErrorMessage[validation] : null;

  async function submit() {
    setSubmitted(true);
    setSubmitError(null);
    if (validation) return;
    try {
      const { familyId, userId } = await onboarding.ensureFamily();
      const p = await create.mutateAsync({ familyId, nickname: nickname.trim() || null, ...input, requestId });
      await onboarding.finish(userId, { kind: 'pregnancy', pregnancyId: p.id });
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      setSubmitError(errorMessage(e));
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('onboarding.startJourney')} onPress={submit} fullWidth loading={create.isPending} testID="start-journey" />}>
      <Stack.Screen options={{ title: t('onboarding.pregnancyTitle') }} />
      <TextField label={t('onboarding.nicknameLabel')} optional placeholder={t('onboarding.nicknamePlaceholder')} value={nickname} onChangeText={setNickname} maxLength={40} />
      <PregnancyDatingForm mode={mode} onModeChange={setMode} dueDate={dueDate} lmp={lmp} onDueDate={setDueDate} onLmp={setLmp} error={fieldError} note={t('onboarding.datingNote')} />
      {submitError ? <Banner tone="danger" message={submitError} /> : null}
    </Screen>
  );
}
