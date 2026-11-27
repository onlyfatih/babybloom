import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { useBackend } from '@/data/backend';
import { errorMessage } from '@/data/errors';
import { resetCacheToSession } from '@/features/profiles';
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { Banner, Button, Screen, TextField } from '@/ui/primitives';

export default function JoinFamily() {
  const backend = useBackend();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim()) return setError(t('errors.required'));
    setBusy(true);
    setError(null);
    try {
      const session = await backend.auth.acceptInvitation({ code, displayName: name.trim() || t('common.you') });
      resetCacheToSession(qc, session);
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('onboarding.joinAction')} onPress={submit} fullWidth loading={busy} />}>
      <Stack.Screen options={{ title: t('onboarding.joinTitle') }} />
      <TextField label={t('onboarding.inviteCodeLabel')} hint={t('onboarding.inviteCodeHint')} placeholder="MINIK-0000" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} error={error} />
      <TextField label={t('onboarding.yourName')} optional placeholder={t('onboarding.yourNamePlaceholder')} value={name} onChangeText={setName} />
      {featureFlags.prototypeTools ? <Banner tone="info" message={t('onboarding.joinDemoHint')} /> : null}
    </Screen>
  );
}
