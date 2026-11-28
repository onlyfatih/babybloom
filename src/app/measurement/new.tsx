import { t } from '@/content/localization';
import { MeasurementForm } from '@/features/measurements/MeasurementForm';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { EmptyState, Screen } from '@/ui/primitives';

export default function NewMeasurement() {
  const session = useRequiredSession();
  const { selected } = useSelectedProfile();
  if (selected?.kind !== 'child') return <Screen><EmptyState title={t('tracking.measurements')} body={t('measurement.pregnancyEmpty')} /></Screen>;
  return <MeasurementForm child={selected.child} familyId={session.family.id} actor={{ userId: session.user.id, membership: session.membership }} />;
}
