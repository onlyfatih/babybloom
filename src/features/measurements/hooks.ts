import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { MeasurementCorrection, NewMeasurementInput } from '@/data/repositories/types';

export function useMeasurements(childId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.measurements(childId ?? '-'), enabled: !!childId, queryFn: () => backend.measurements.listForChild(childId!) });
}

export function useCreateMeasurement() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewMeasurementInput) => backend.measurements.create(input),
    onSuccess: (m) => qc.invalidateQueries({ queryKey: queryKeys.measurements(m.childId) }),
  });
}

export function useDeleteMeasurement(childId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.measurements.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.measurements(childId) }),
  });
}

export function useUpdateMeasurement() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, correction }: { id: string; correction: MeasurementCorrection }) => backend.measurements.update(id, correction),
    onSuccess: (m) => qc.invalidateQueries({ queryKey: queryKeys.measurements(m.childId) }),
  });
}
