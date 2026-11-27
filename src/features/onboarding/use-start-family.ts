import { useQueryClient } from '@tanstack/react-query';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import { t } from '@/content/localization';

/**
 * Returns the current session, creating a new family first if needed.
 * P3: preceded by real sign-up/sign-in (Supabase Auth).
 */
export function useEnsureFamily() {
  const backend = useBackend();
  const qc = useQueryClient();
  return async (relationshipLabel = t('onboarding.defaultRelationship')) => {
    const existing = await backend.auth.getSession();
    if (existing) return existing;
    const session = await backend.auth.createFamily({ displayName: t('common.you'), relationshipLabel });
    qc.setQueryData(queryKeys.session, session);
    return session;
  };
}
