import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { useSessionApi } from '@/features/session';
import { isCodeShaped, normalizeCode } from '@/features/session/sign-in-rules';
import { Banner, Button, Screen, Text, TextField } from '@/ui/primitives';

/** Step 2: type the 6-digit code from the email. No links, so it works the same on every platform. */
export default function SignInCode() {
  const session = useSessionApi();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    const value = normalizeCode(code);
    if (!isCodeShaped(value)) return setError(t('auth.codeInvalidFormat'));
    setBusy(true);
    setError(null);
    try {
      // On success the session state changes and the route guards move on.
      await session.verifyEmailCode(email, value);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await session.requestEmailCode(email);
      setCode('');
      setNotice(t('auth.resent'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} footer={<Button label={t('auth.verify')} onPress={verify} fullWidth loading={busy} testID="verify-code" />}>
      <Stack.Screen options={{ title: t('auth.codeTitle') }} />
      <Text color="textSecondary">{t('auth.codeSentTo', { email })}</Text>
      <TextField
        label={t('auth.codeLabel')}
        value={code}
        onChangeText={(v) => setCode(normalizeCode(v))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        onSubmitEditing={verify}
        error={error}
        testID="code"
      />
      {notice ? <Banner tone="success" message={notice} /> : null}
      <Button label={t('auth.resend')} variant="secondary" onPress={resend} loading={resending} fullWidth />
      <Button label={t('auth.changeEmail')} variant="ghost" onPress={() => router.back()} fullWidth />
    </Screen>
  );
}
