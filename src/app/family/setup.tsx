import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { useSessionApi } from '@/features/session';
import { Banner, Button, Card, Divider, ListRow, Screen, SectionHeader, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

/**
 * Signed in, no family selected (R2): create a family, join with an
 * invitation code, or choose among several active memberships. The app never
 * picks "the first membership" on its own (docs/backend.md § Product rules).
 */
export default function FamilySetup() {
  const session = useSessionApi();
  const state = session.state;
  const choices = state.kind === 'authenticated-without-family' ? state.choices : [];
  const revoked = state.kind === 'authenticated-without-family' && state.notice === 'membership-revoked';
  const email = state.kind === 'authenticated-without-family' ? state.identity.email : null;

  const [familyName, setFamilyName] = useState(t('onboarding.familyNameDefault'));
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; form?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    if (!displayName.trim()) return setErrors({ displayName: t('errors.required') });
    setBusy('create');
    setErrors({});
    try {
      await session.createFamily({
        familyName: familyName.trim() || t('onboarding.familyNameDefault'),
        displayName: displayName.trim(),
        relationshipLabel: relationship.trim() || t('onboarding.defaultRelationship'),
      });
      router.replace('/');
    } catch (e) {
      setErrors({ form: errorMessage(e) });
      setBusy(null);
    }
  }

  async function choose(familyId: string) {
    setBusy(familyId);
    try {
      await session.selectFamily(familyId);
      router.replace('/');
    } catch (e) {
      setErrors({ form: errorMessage(e) });
      setBusy(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">{t('familySetup.title')}</Text>
      {email ? (
        <Text variant="caption" color="textSecondary">
          {t('familySetup.signedInAs', { email })}
        </Text>
      ) : null}
      {revoked ? <Banner tone="warning" message={t('familySetup.revoked')} /> : null}
      {errors.form ? <Banner tone="danger" message={errors.form} /> : null}

      {choices.length > 1 ? (
        <View>
          <SectionHeader title={t('familySetup.chooseTitle')} />
          <Card padded={false}>
            {choices.map((c, i) => (
              <View key={c.family.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow icon="home-outline" title={c.family.name} subtitle={c.membership.relationshipLabel} onPress={() => (busy ? undefined : choose(c.family.id))} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <Text color="textSecondary">{t('familySetup.intro')}</Text>
      <SectionHeader title={t('familySetup.createTitle')} />
      <View style={{ gap: spacing.md }}>
        <TextField label={t('familySetup.familyNameLabel')} value={familyName} onChangeText={setFamilyName} maxLength={60} />
        <TextField label={t('onboarding.yourName')} placeholder={t('onboarding.yourNamePlaceholder')} value={displayName} onChangeText={setDisplayName} maxLength={60} error={errors.displayName} testID="display-name" />
        <TextField label={t('familySetup.relationshipLabel')} optional placeholder={t('familySetup.relationshipPlaceholder')} value={relationship} onChangeText={setRelationship} maxLength={40} />
        <Button label={t('familySetup.create')} onPress={create} fullWidth loading={busy === 'create'} testID="create-family" />
      </View>

      <SectionHeader title={t('familySetup.joinTitle')} />
      <Button label={t('familySetup.join')} variant="secondary" icon="people-outline" onPress={() => router.push('/onboarding/join')} fullWidth />
      <Button label={t('familySetup.signOut')} variant="ghost" onPress={() => void session.signOut()} fullWidth />
    </Screen>
  );
}
