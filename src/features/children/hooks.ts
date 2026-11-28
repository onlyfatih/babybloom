import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { NewChildInput } from '@/data/repositories/types';

export function useCreateChild() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...input }: NewChildInput & { requestId?: string }) => backend.profiles.createChild(input, requestId ? { requestId } : undefined),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles(c.familyId) });
      qc.invalidateQueries({ queryKey: queryKeys.measurements(c.id) });
    },
  });
}
