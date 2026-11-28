import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { NewChildInput, NewPregnancyInput, ProfileRepository } from '@/data/repositories/types';

export function useCreatePregnancy() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...input }: NewPregnancyInput & { requestId?: string }) => backend.profiles.createPregnancy(input, requestId ? { requestId } : undefined),
    onSuccess: (p) => qc.invalidateQueries({ queryKey: queryKeys.profiles(p.familyId) }),
  });
}

export function useUpdatePregnancy(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<ProfileRepository['updatePregnancy']>[1] }) => backend.profiles.updatePregnancy(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles(familyId) }),
  });
}

export function useRecordBirth(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pregnancyId, children }: { pregnancyId: string; children: Omit<NewChildInput, 'familyId' | 'originPregnancyId'>[] }) => backend.profiles.recordBirth(pregnancyId, children),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles(familyId) }),
  });
}
