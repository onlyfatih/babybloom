import { t } from '@/content/localization';
import { MemoryEditor } from '@/features/memories';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { errorMessage } from '@/data/errors';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/ui/primitives';

export default function NewMemory() {
  const session = useRequiredSession();
  const { selected, isLoading, error, refetch } = useSelectedProfile();
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (error) return <Screen><ErrorState message={errorMessage(error)} onRetry={refetch} /></Screen>;
  if (!selected) return <Screen><EmptyState title={t('profile.addProfile')} /></Screen>;
  return <MemoryEditor familyId={session.family.id} subject={selected.ref} />;
}
