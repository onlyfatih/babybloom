import { AppointmentForm } from '@/features/appointments';
import { useSelectedProfile } from '@/features/profiles';

export default function NewAppointment() {
  const { selected } = useSelectedProfile();
  return <AppointmentForm subject={selected?.ref ?? null} />;
}
