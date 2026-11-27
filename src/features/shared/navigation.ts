import { router } from 'expo-router';

/** Back if there is history (normal app use), otherwise home (deep link / web reload). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
