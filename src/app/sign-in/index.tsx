import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { illustrationForWeek } from '@/content/illustrations';
import { errorMessage } from '@/data/errors';
import { useSessionApi } from '@/features/session';
import { isPlausibleEmail } from '@/features/session/sign-in-rules';
import { Banner, Button, Screen, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

/** Step 1 of email one-time-code sign-in (docs/auth.md). The first code creates the account. */
export default function SignIn() {
  const session = useSessionApi();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reason = session.state.kind === 'signed-out' ? session.state.reason : undefined;

  async function submit() {
    const value = email.trim().toLowerCase();
    if (!isPlausibleEmail(value)) return setError(t('auth.emailInvalid'));
    setBusy(true);
    setError(null);
    try {
      await session.requestEmailCode(value);
      router.push({ pathname: '/sign-in/code', params: { email: value } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} footer={<Button label={t('auth.sendCode')} onPress={submit} fullWidth loading={busy} testID="send-code" />}>
      <View style={styles.hero}>
        <View accessible={false}>{illustrationForWeek(20).render(112)}</View>
        <Text variant="display" align="center">
          {t('common.appName')}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {t('onboarding.tagline')}
        </Text>
      </View>
      {reason === 'session-expired' ? <Banner tone="warning" message={t('auth.sessionExpired')} /> : null}
      {reason === 'signed-out' ? <Banner tone="success" message={t('auth.signedOut')} /> : null}
      <Text variant="heading">{t('auth.signInTitle')}</Text>
      <Text color="textSecondary">{t('auth.intro')}</Text>
      <TextField
        label={t('auth.emailLabel')}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={submit}
        error={error}
        testID="email"
      />
      <Text variant="caption" color="textSecondary">
        {t('auth.recovery')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
});
