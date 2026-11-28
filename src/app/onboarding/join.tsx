import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { useSessionApi } from '@/features/session';
import { Banner, Button, Screen, TextField } from '@/ui/primitives';

export default function JoinFamily() {
  const session = useSessionApi();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim()) return setError(t('errors.required'));
    setBusy(true);
    setError(null);
    try {
      await session.acceptInvitation(code.trim().toUpperCase(), name.trim() || t('common.you'));
      router.dismissAll();
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('onboarding.joinAction')} onPress={submit} fullWidth loading={busy} />}>
      <Stack.Screen options={{ title: t('onboarding.joinTitle') }} />
      <TextField label={t('onboarding.inviteCodeLabel')} hint={t('onboarding.inviteCodeHint')} placeholder="ABCDE-FGHJK-…" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} error={error} />
      <TextField label={t('onboarding.yourName')} optional placeholder={t('onboarding.yourNamePlaceholder')} value={name} onChangeText={setName} />
      {session.mode === 'demo' ? <Banner tone="info" message={t('onboarding.joinDemoHint')} /> : null}
    </Screen>
  );
}
