import { useBackend } from '@/data/backend';
import type { ProfileRef } from '@/domain/model';
import { t } from '@/content/localization';
import { useSessionApi } from '@/features/session';

/**
 * First-profile flow (R2). The family comes from the session: the current one
 * (real accounts create or join a family first), or, in the demo welcome flow
 * only, a new demo family. The session state is re-resolved once, after the
 * profile exists, so the app moves straight to the timeline.
 */
export function useProfileOnboarding() {
  const session = useSessionApi();
  const backend = useBackend();
  return {
    ensureFamily: (relationshipLabel = t('onboarding.defaultRelationship')) =>
      session.ensureFamily({ familyName: t('onboarding.familyNameDefault'), displayName: t('common.you'), relationshipLabel }),
    async finish(userId: string, ref: ProfileRef) {
      await backend.preferences.update(userId, { selectedProfile: ref });
      await session.refresh();
    },
  };
}
