import { Fraunces_400Regular_Italic, Fraunces_600SemiBold, useFonts as useFraunces } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider } from '@/data/backend';
import { useSession } from '@/features/profiles';
import { DataError } from '@/data/repositories/types';
import { colors, fontFamilies } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !(error instanceof DataError && ['forbidden', 'not-found', 'membership-revoked', 'session-expired'].includes(error.code)) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold, Fraunces_400Regular_Italic });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const ready = frauncesLoaded && interLoaded;

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <BackendProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </BackendProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Route protection: app screens require a session; the welcome and join screens
 * require none. Onboarding forms for adding a profile stay reachable for both.
 * The splash screen stays up until the stored session has been read, so deep
 * links never render a protected screen without a session.
 */
function AppNavigator() {
  const session = useSession();
  // Only the very first read blocks rendering; later refetches never unmount the navigator.
  const loading = session.isPending && session.data === undefined;
  const signedIn = !!session.data;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fontFamilies.textSemiBold, color: colors.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/pregnancy" />
      <Stack.Screen name="onboarding/child" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/join" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.5, 0.75], sheetGrabberVisible: true }} />
        <Stack.Screen name="profiles" options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.6, 0.9], sheetGrabberVisible: true }} />
        <Stack.Screen name="week/[week]" />
        <Stack.Screen name="memory/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="memory/[id]" />
        <Stack.Screen name="memory/edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="measurement/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointment/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointment/[id]" />
        <Stack.Screen name="family/invite" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="export" />
        <Stack.Screen name="preview/visuals" />
        <Stack.Screen name="pregnancy/manage" />
        <Stack.Screen name="pregnancy/dating" />
        <Stack.Screen name="pregnancy/birth" />
      </Stack.Protected>
    </Stack>
  );
}
