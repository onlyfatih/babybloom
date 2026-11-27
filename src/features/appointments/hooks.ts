import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { AppointmentInput } from '@/data/repositories/types';

export function useAppointments(familyId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.appointments(familyId ?? '-'), enabled: !!familyId, queryFn: () => backend.appointments.list(familyId!) });
}

export function useSaveAppointment(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AppointmentInput }) => (id ? backend.appointments.update(id, input) : backend.appointments.create(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments(familyId) }),
  });
}

export function useDeleteAppointment(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.appointments.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments(familyId) }),
  });
}
