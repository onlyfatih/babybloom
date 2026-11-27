import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import type { Child, Pregnancy, ProfileRef } from '@/domain/model';
import type { SessionInfo } from '@/data/repositories/types';

export type Profile = { kind: 'pregnancy'; ref: ProfileRef; pregnancy: Pregnancy } | { kind: 'child'; ref: ProfileRef; child: Child };

export function useSession() {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.session, queryFn: () => backend.auth.getSession(), staleTime: Infinity });
}

/** Use inside the tab area, where a session is guaranteed by the root redirect. */
export function useRequiredSession(): SessionInfo {
  const { data } = useSession();
  if (!data) throw new Error('useRequiredSession called without a session');
  return data;
}

export function useProfiles(familyId: string | undefined) {
  const backend = useBackend();
  return useQuery({
    queryKey: queryKeys.profiles(familyId ?? '-'),
    enabled: !!familyId,
    queryFn: async () => {
      const { pregnancies, children } = await backend.profiles.list(familyId!);
      const profiles: Profile[] = [
        ...pregnancies.filter((p) => p.status !== 'born').map((p) => ({ kind: 'pregnancy' as const, ref: { kind: 'pregnancy' as const, pregnancyId: p.id }, pregnancy: p })),
        ...children.map((c) => ({ kind: 'child' as const, ref: { kind: 'child' as const, childId: c.id }, child: c })),
      ];
      return { pregnancies, children, profiles };
    },
  });
}

export function sameRef(a: ProfileRef | null | undefined, b: ProfileRef | null | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === 'pregnancy' ? b.kind === 'pregnancy' && a.pregnancyId === b.pregnancyId : b.kind === 'child' && a.childId === b.childId;
}

export function usePreferences(userId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.preferences(userId ?? '-'), enabled: !!userId, queryFn: () => backend.preferences.get(userId!) });
}

/** The profile shown on Bugün / Hikâyemiz / Takip. Falls back to the first active profile. */
export function useSelectedProfile() {
  const session = useSession().data;
  const profilesQuery = useProfiles(session?.family.id);
  const prefs = usePreferences(session?.user.id);
  const profiles = profilesQuery.data?.profiles ?? [];
  const active = profiles.filter((p) => p.kind === 'child' || p.pregnancy.status === 'active');
  const selected = profiles.find((p) => sameRef(p.ref, prefs.data?.selectedProfile)) ?? active[0] ?? profiles[0] ?? null;
  return {
    selected,
    profiles,
    pregnancies: profilesQuery.data?.pregnancies ?? [],
    children: profilesQuery.data?.children ?? [],
    isLoading: profilesQuery.isLoading || prefs.isLoading,
    error: profilesQuery.error ?? prefs.error,
    refetch: () => Promise.all([profilesQuery.refetch(), prefs.refetch()]),
  };
}

export function useSelectProfile() {
  const backend = useBackend();
  const qc = useQueryClient();
  const session = useSession().data;
  return useMutation({
    mutationFn: (ref: ProfileRef) => backend.preferences.update(session!.user.id, { selectedProfile: ref }),
    onSuccess: (pref) => qc.setQueryData(queryKeys.preferences(pref.userId), pref),
  });
}

export function profileName(p: Profile | null, fallback: string): string {
  if (!p) return fallback;
  return p.kind === 'child' ? p.child.name : p.pregnancy.nickname || fallback;
}

/** Replaces the cached session and drops every other cached query (switching family/user). */
export function resetCacheToSession(qc: ReturnType<typeof useQueryClient>, session: SessionInfo | null) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
  qc.setQueryData(queryKeys.session, session);
}
