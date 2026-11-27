/**
 * Week artwork with a gentle, non-anatomical motion (±1.2° sway, slight lift).
 *
 * - Static when the system "reduce motion" setting is on, not yet known, or
 *   `animate` is false.
 * - Paused while the screen is not focused or the app is in the background.
 * - Transform/opacity only (native driver), fixed square box: no layout shift.
 * - If the image fails to load, says so in text. It never swaps in other art.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { pregnancyAsset } from '@/content/illustrations/pregnancy-assets';
import { Icon, Text } from '@/ui/primitives';
import { useReducedMotionSetting } from '@/ui/primitives/use-reduced-motion';
import { colors, radii, spacing } from '@/ui/tokens';

const PERIOD_MS = 3500;

export function WeekIllustration({ illustrationId, size, animate = true }: { illustrationId: string | null; size: number; animate?: boolean }) {
  const asset = pregnancyAsset(illustrationId);
  const reduced = useReducedMotionSetting();
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [failed, setFailed] = useState(false);
  const [phase] = useState(() => new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  // Motion starts only once the system setting is known to allow it.
  const running = animate && reduced === false && focused && foreground && !failed && asset !== null;
  useEffect(() => {
    if (!running) {
      phase.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: PERIOD_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: PERIOD_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [running, phase]);

  if (!asset || failed) {
    return (
      <View style={[styles.box, styles.missing, { width: size, height: size }]} accessibilityRole="image" accessibilityLabel={t('art.loadFailed')}>
        <Icon name="image-outline" size={28} color="textSecondary" />
        <Text variant="caption" color="textSecondary" align="center">
          {t('art.loadFailed')}
        </Text>
      </View>
    );
  }

  const rotate = phase.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const translateY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Animated.Image
        source={asset.source}
        onError={() => setFailed(true)}
        accessibilityRole="image"
        accessibilityLabel={t(asset.altKey)}
        resizeMode="contain"
        style={{ width: size, height: size, transform: [{ translateY }, { rotate }] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  missing: { gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, padding: spacing.lg },
});
