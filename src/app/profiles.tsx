import { router } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { formatAge } from '@/content/localization/format';
import { useBackend } from '@/data/backend';
import { childAge } from '@/domain/dates/age';
import { pregnancyView } from '@/features/pregnancy';
import { Profile, profileName, sameRef, useSelectedProfile, useSelectProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { Avatar, Card, Divider, Icon, ListRow, Screen, Text } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export default function ProfileSwitcher() {
  const backend = useBackend();
  const today = useToday();
  const { profiles, selected } = useSelectedProfile();
  const select = useSelectProfile();

  const subtitle = (p: Profile) => {
    if (p.kind === 'child') {
      const age = childAge(p.child.birthDate, today);
      return `${t('profile.childLabel')} · ${age ? formatAge(age) : ''}`;
    }
    if (p.pregnancy.status === 'archived' || p.pregnancy.status === 'ended') return `${t('profile.pregnancyLabel')} · ${t('profile.archivedLabel')}`;
    return `${t('profile.pregnancyLabel')} · ${pregnancyView(p.pregnancy, today).primary}`;
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">{t('profile.switchTitle')}</Text>
      <Card padded={false}>
        {profiles.map((p, i) => {
          const isSelected = sameRef(p.ref, selected?.ref);
          const name = profileName(p, t('profile.unnamedPregnancy'));
          const avatar = p.kind === 'child' && p.child.avatarMediaId ? backend.memories.mediaSource(p.child.avatarMediaId) : null;
          return (
            <View key={p.kind === 'child' ? p.child.id : p.pregnancy.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={name}
                subtitle={subtitle(p)}
                leading={<Avatar name={name} uri={avatar} size={44} tone={p.kind === 'child' ? 'surfaceAccent' : 'surfaceWarm'} />}
                trailing={isSelected ? <Icon name="checkmark-circle" color="primary" /> : null}
                showChevron={false}
                onPress={async () => {
                  await select.mutateAsync(p.ref);
                  goBack();
                }}
              />
            </View>
          );
        })}
      </Card>
      <Card padded={false}>
        <ListRow title={`${t('profile.addProfile')}: ${t('onboarding.expecting')}`} icon="leaf-outline" onPress={() => { goBack(); router.push('/onboarding/pregnancy'); }} />
        <Divider />
        <ListRow title={`${t('profile.addProfile')}: ${t('onboarding.born')}`} icon="happy-outline" onPress={() => { goBack(); router.push('/onboarding/child'); }} />
      </Card>
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

