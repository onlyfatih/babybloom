import { Stack } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { LocalDate } from '@/domain/dates/local-date';
import { validateDating } from '@/domain/pregnancy/gestation';
import { useUpdatePregnancy } from '@/features/pregnancy';
import { DatingMode, datingErrorMessage, PregnancyDatingForm } from '@/features/pregnancy/PregnancyDatingForm';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { Banner, Button, EmptyState, Screen, TextField } from '@/ui/primitives';

/**
 * Editing dating: the active source is whichever mode is saved. Switching to LMP
 * clears the clinician due date (and vice versa) so the source is never ambiguous.
 */
export default function EditDating() {
  const session = useRequiredSession();
  const today = useToday();
  const { selected } = useSelectedProfile();
  const update = useUpdatePregnancy(session.family.id);
  const p = selected?.kind === 'pregnancy' ? selected.pregnancy : null;
  const [nickname, setNickname] = useState(p?.nickname ?? '');
  const [mode, setMode] = useState<DatingMode>(p?.clinicianDueDate ? 'due-date' : 'lmp');
  const [dueDate, setDueDate] = useState<LocalDate | null>(p?.clinicianDueDate ?? null);
  const [lmp, setLmp] = useState<LocalDate | null>(p?.lastMenstrualPeriod ?? null);
  const [error, setError] = useState<string | null>(null);
  if (!p) return <Screen><EmptyState title={t('pregnancy.editDating')} /></Screen>;
  const input = mode === 'due-date' ? { clinicianDueDate: dueDate, lastMenstrualPeriod: null } : { clinicianDueDate: null, lastMenstrualPeriod: lmp };
  const v = validateDating(input, today);

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <Button
          label={t('common.save')}
          fullWidth
          loading={update.isPending}
          onPress={async () => {
            if (v) return;
            try {
              await update.mutateAsync({ id: p.id, patch: { ...input, nickname: nickname.trim() || null } });
              goBack();
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        />
      }
    >
      <Stack.Screen options={{ title: t('pregnancy.editDating') }} />
      <TextField label={t('onboarding.nicknameLabel')} optional value={nickname} onChangeText={setNickname} />
      <PregnancyDatingForm mode={mode} onModeChange={setMode} dueDate={dueDate} lmp={lmp} onDueDate={setDueDate} onLmp={setLmp} error={v && v !== 'missing' ? datingErrorMessage[v] : null} note={t('pregnancy.datingEditNote')} />
      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
