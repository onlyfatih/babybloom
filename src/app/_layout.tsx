import { Fraunces_400Regular_Italic, Fraunces_600SemiBold, useFonts as useFraunces } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider, createAppBackends, type AppBackends } from '@/data/backend';
import { ConfigurationGate } from '@/features/configuration/ConfigurationGate';
import { DemoBadge, SessionErrorScreen, SessionProvider, useSessionApi } from '@/features/session';
import { configResult } from '@/infrastructure/configuration/app-config';
import { colors, fontFamilies } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold, Fraunces_400Regular_Italic });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const ready = frauncesLoaded && interLoaded;

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ConfigurationGate>
        <App />
      </ConfigurationGate>
    </SafeAreaProvider>
  );
}

/** Rendered only with a valid configuration (ConfigurationGate). */
function App() {
  const [backends] = useState<AppBackends>(() => {
    if (!configResult.ok) throw new Error('App rendered with an invalid configuration');
    return createAppBackends(configResult.config);
  });
  return (
    <SessionProvider backends={backends}>
      <BackendProvider backend={backends.backend}>
        <AppNavigator />
        {backends.kind === 'demo' ? <DemoBadge /> : null}
      </BackendProvider>
    </SessionProvider>
  );
}

/**
 * Route protection from the session state machine (docs/auth.md):
 *
 * - bootstrapping: splash stays up; nothing protected can render.
 * - signed-out: email sign-in (real) or the demo welcome flow.
 * - authenticated-without-family: create / join / choose a family.
 * - authenticated-with-family-without-profile: first-profile choice.
 * - ready: the app.
 * - recoverable-error: retry screen; nothing is deleted.
 *
 * The whole navigator remounts when the (user, family) scope changes
 * (SessionProvider keys it), so no screen of the previous scope survives.
 */
function AppNavigator() {
  const { state, mode } = useSessionApi();
  const k = state.kind;
  const demo = mode === 'demo';
  const signedOut = k === 'signed-out';
  const noFamily = k === 'authenticated-without-family';
  const noProfile = k === 'authenticated-with-family-without-profile';
  const ready = k === 'ready';
  const loading = k === 'bootstrapping';

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  if (loading) return null;
  if (k === 'recoverable-error') return <SessionErrorScreen />;

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
      <Stack.Protected guard={signedOut && !demo}>
        <Stack.Screen name="sign-in/index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in/code" />
      </Stack.Protected>
      <Stack.Protected guard={(signedOut && demo) || noProfile}>
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={(signedOut && demo) || noFamily}>
        <Stack.Screen name="onboarding/join" />
      </Stack.Protected>
      <Stack.Protected guard={noFamily}>
        <Stack.Screen name="family/setup" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={(signedOut && demo) || noProfile || ready}>
        <Stack.Screen name="onboarding/pregnancy" />
        <Stack.Screen name="onboarding/child" />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
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
