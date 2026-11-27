import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { NewChildInput } from '@/data/repositories/types';

export function useCreateChild() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewChildInput) => backend.profiles.createChild(input),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles(c.familyId) });
      qc.invalidateQueries({ queryKey: queryKeys.measurements(c.id) });
    },
  });
}
