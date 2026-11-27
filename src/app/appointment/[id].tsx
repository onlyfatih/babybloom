import { useLocalSearchParams } from 'expo-router';
import { t } from '@/content/localization';
import { AppointmentForm, useAppointments } from '@/features/appointments';
import { useRequiredSession } from '@/features/profiles';
import { ErrorState, LoadingState, Screen } from '@/ui/primitives';

export default function EditAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useRequiredSession();
  const q = useAppointments(session.family.id);
  const appt = q.data?.find((a) => a.id === id);
  if (q.isLoading) return <Screen><LoadingState /></Screen>;
  if (!appt) return <Screen><ErrorState message={t('errors.recordDeleted')} /></Screen>;
  return <AppointmentForm subject={appt.subject} existing={appt} />;
}
