import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';
import { useBackend } from '@/data/backend';
import { t } from '@/content/localization';
import { LocalDate } from '@/domain/dates/local-date';
import { Avatar, Button, DateField, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';
import { ChildDraft, ChildDraftErrors } from './child-draft';

export function ChildForm({ draft, onChange, errors, today, showPhoto = true }: { draft: ChildDraft; onChange: (d: ChildDraft) => void; errors: ChildDraftErrors; today: LocalDate; showPhoto?: boolean }) {
  const backend = useBackend();
  const set = (patch: Partial<ChildDraft>) => onChange({ ...draft, ...patch });

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false });
    if (!r.canceled && r.assets[0]) set({ photoUri: r.assets[0].uri });
  }

  return (
    <View style={styles.form}>
      {showPhoto && backend.capabilities.photos ? (
        <View style={styles.photoRow}>
          <Avatar name={draft.name || '?'} uri={draft.photoUri} size={72} />
          <Button label={draft.photoUri ? t('onboarding.changePhoto') : t('onboarding.addPhoto')} variant="secondary" icon="camera-outline" onPress={pickAvatar} />
        </View>
      ) : null}
      <TextField label={t('onboarding.childNameLabel')} placeholder={t('onboarding.childNamePlaceholder')} value={draft.name} onChangeText={(name) => set({ name })} error={errors.name} autoCapitalize="words" maxLength={60} testID="child-name" />
      <DateField label={t('onboarding.birthDateLabel')} value={draft.birthDate} onChange={(birthDate) => set({ birthDate })} invalidMessage={t('errors.invalidDate')} error={errors.birthDate} shortcuts={[{ label: t('common.today'), value: today }]} testID="birth-date" />
      <TextField label={t('onboarding.birthTimeLabel')} optional placeholder="SS:DD" value={draft.birthTime} onChangeText={(birthTime) => set({ birthTime: birthTime.replace(/[^\d:]/g, '').slice(0, 5) })} error={errors.birthTime} keyboardType="numbers-and-punctuation" maxLength={5} />
      <View style={styles.section}>
        <Text variant="subheading">{t('onboarding.birthMeasurements')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('onboarding.birthMeasurementsHint')}
        </Text>
      </View>
      <View style={styles.measureRow}>
        <View style={styles.measureCell}>
          <TextField label={`${t('measurement.weight')} (kg)`} optional placeholder="3,4" value={draft.weight} onChangeText={(weight) => set({ weight })} error={errors.weight} keyboardType="decimal-pad" />
        </View>
        <View style={styles.measureCell}>
          <TextField label={`${t('measurement.length')} (cm)`} optional placeholder="50" value={draft.length} onChangeText={(length) => set({ length })} error={errors.length} keyboardType="decimal-pad" />
        </View>
      </View>
      <TextField label={`${t('measurement.head')} (cm)`} optional placeholder="34,5" value={draft.head} onChangeText={(head) => set({ head })} error={errors.head} keyboardType="decimal-pad" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  section: { gap: 2, marginTop: spacing.sm },
  measureRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  measureCell: { flex: 1, minWidth: 140 },
});
