import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { FamilyRole } from '@/domain/model';

export function useMembers(familyId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.members(familyId ?? '-'), enabled: !!familyId, queryFn: () => backend.family.members(familyId!) });
}

export function useInvitations(familyId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.invitations(familyId ?? '-'), enabled: !!familyId, queryFn: () => backend.family.invitations(familyId!) });
}

export function useCreateInvitation(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: FamilyRole; relationshipLabel: string }) => backend.family.createInvitation({ familyId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invitations(familyId) }),
  });
}

export function useRevokeInvitation(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => backend.family.revokeInvitation(id), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invitations(familyId) }) });
}

export function useRevokeMember(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (membershipId: string) => backend.family.revokeMember(membershipId), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.members(familyId) }) });
}

/** userId -> display name, for author attribution. */
export function useAuthorNames(familyId: string | undefined): Record<string, string> {
  const members = useMembers(familyId).data ?? [];
  return Object.fromEntries(members.map((m) => [m.userId, m.user.displayName]));
}
