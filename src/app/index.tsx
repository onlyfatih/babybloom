import { Redirect } from 'expo-router';
import { useSession } from '@/features/profiles';
import { LoadingState, Screen } from '@/ui/primitives';

export default function Index() {
  const session = useSession();
  if (session.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  return <Redirect href={session.data ? '/(tabs)' : '/onboarding'} />;
}
