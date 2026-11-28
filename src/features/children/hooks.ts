import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { ChildPatch, LocalPhoto, NewChildInput } from '@/data/repositories/types';
import type { Child } from '@/domain/model';

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

function useChildMutation<TArgs>(run: (backend: ReturnType<typeof useBackend>, args: TArgs) => Promise<Child>) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(backend, args),
    onSuccess: (c) => qc.invalidateQueries({ queryKey: queryKeys.profiles(c.familyId) }),
  });
}

export const useUpdateChild = () => useChildMutation<{ id: string; patch: ChildPatch }>((b, a) => b.profiles.updateChild(a.id, a.patch));
export const useSetChildArchived = () => useChildMutation<{ id: string; archived: boolean }>((b, a) => b.profiles.setChildArchived(a.id, a.archived));
export const useSetChildPhoto = () => useChildMutation<{ id: string; photo: LocalPhoto | null }>((b, a) => b.profiles.setChildPhoto(a.id, a.photo));
