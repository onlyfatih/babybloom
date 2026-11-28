import { useLocalSearchParams } from 'expo-router';
import { t } from '@/content/localization';
import { useMeasurements } from '@/features/measurements';
import { MeasurementForm } from '@/features/measurements/MeasurementForm';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { ErrorState, LoadingState, Screen } from '@/ui/primitives';

export default function EditMeasurement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useRequiredSession();
  const { selected } = useSelectedProfile();
  const child = selected?.kind === 'child' ? selected.child : null;
  const q = useMeasurements(child?.id);
  const m = q.data?.find((x) => x.id === id);
  if (q.isLoading) return <Screen><LoadingState /></Screen>;
  if (!child || !m) return <Screen><ErrorState message={t('errors.recordDeleted')} /></Screen>;
  return <MeasurementForm child={child} familyId={session.family.id} actor={{ userId: session.user.id, membership: session.membership }} existing={m} />;
}
