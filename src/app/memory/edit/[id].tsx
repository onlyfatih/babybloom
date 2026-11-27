import { useLocalSearchParams } from 'expo-router';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { MemoryEditor, useMemory } from '@/features/memories';
import { useRequiredSession } from '@/features/profiles';
import { ErrorState, LoadingState, Screen } from '@/ui/primitives';

export default function EditMemory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useRequiredSession();
  const memory = useMemory(id);
  if (memory.isLoading) return <Screen><LoadingState /></Screen>;
  if (!memory.data) return <Screen><ErrorState message={memory.error ? errorMessage(memory.error) : t('memory.notFound')} /></Screen>;
  return <MemoryEditor familyId={session.family.id} subject={memory.data.subject} existing={memory.data} />;
}
