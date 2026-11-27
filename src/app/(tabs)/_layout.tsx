import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/content/localization';
import { useSession } from '@/features/profiles';
import { Icon, IconName } from '@/ui/primitives';
import { colors, fontFamilies, layout } from '@/ui/tokens';

function tab(icon: IconName, activeIcon: IconName) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={focused ? activeIcon : icon} color={focused ? 'primary' : 'textSecondary'} size={24} />;
  };
}

/**
 * Four top-level tabs (no tabs for excluded features). JS tabs from expo-router are used
 * instead of NativeTabs so the bar is identical on iOS, Android and the web preview
 * (docs/decisions.md ADR-004).
 */
export default function TabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  if (!session.isLoading && !session.data) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: layout.tabBarHeight + insets.bottom, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 8) },
        tabBarLabelStyle: { fontFamily: fontFamilies.textMedium, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: tab('sunny-outline', 'sunny') }} />
      <Tabs.Screen name="story" options={{ title: t('tabs.story'), tabBarIcon: tab('book-outline', 'book') }} />
      <Tabs.Screen name="tracking" options={{ title: t('tabs.tracking'), tabBarIcon: tab('analytics-outline', 'analytics') }} />
      <Tabs.Screen name="family" options={{ title: t('tabs.family'), tabBarIcon: tab('people-outline', 'people') }} />
    </Tabs>
  );
}
