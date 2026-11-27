import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors, ColorRole } from '../tokens';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  uri?: string | number | null;
  size?: number;
  tone?: Extract<ColorRole, 'surfaceAccent' | 'surfaceWarm' | 'surfaceCalm'>;
}

export function Avatar({ name, uri, size = 48, tone = 'surfaceWarm' }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('tr-TR');
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[tone] }]} accessible accessibilityRole="image" accessibilityLabel={name}>
      {uri ? (
        <Image source={uri} style={{ width: size, height: size }} contentFit="cover" accessible={false} />
      ) : (
        <Text variant={size >= 64 ? 'title' : 'bodyStrong'} style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.surface },
});
