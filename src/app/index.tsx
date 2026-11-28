import { Redirect, type Href } from 'expo-router';
import { useSessionApi } from '@/features/session';
import { LoadingState, Screen } from '@/ui/primitives';

/** Entry hub: sends each session state to its screen (guards in _layout.tsx enforce it). */
export default function Index() {
  const { state, mode } = useSessionApi();
  let href: Href;
  switch (state.kind) {
    case 'signed-out':
      href = mode === 'demo' ? '/onboarding' : '/sign-in';
      break;
    case 'authenticated-without-family':
      href = '/family/setup';
      break;
    case 'authenticated-with-family-without-profile':
      href = '/onboarding';
      break;
    case 'ready':
      href = '/(tabs)';
      break;
    default:
      return (
        <Screen scroll={false}>
          <LoadingState />
        </Screen>
      );
  }
  return <Redirect href={href} />;
}
