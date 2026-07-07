import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, type StyleProp, type ViewStyle } from 'react-native';

import { SpringPressable } from './SpringPressable';
import { useAppTheme } from '@/lib/stores/theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  /** Visual emphasis. When false the button renders the flat disabled track
   *  but remains tappable (so validation alerts can explain), unless
   *  `disabled` also blocks the press. */
  enabled?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** md = compact (13/12), lg = full-width footer CTA (16/16). */
  size?: 'md' | 'lg';
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** The app's primary action button: brand gradient, spring press, haptic.
 *  One implementation so every CTA speaks the same language. */
export function GradientButton({
  label,
  onPress,
  enabled = true,
  disabled = false,
  loading = false,
  size = 'lg',
  radius = 14,
  style,
  accessibilityLabel,
}: GradientButtonProps) {
  const C = useAppTheme();
  const lg = size === 'lg';
  return (
    <SpringPressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic
      accessibilityLabel={accessibilityLabel ?? label}
      style={[{ borderRadius: radius }, style]}
    >
      <LinearGradient
        colors={
          enabled
            ? [C.heroTop, C.heroMid, C.heroBot]
            : [C.borderLight, C.borderLight, C.borderLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          borderRadius: radius,
          overflow: 'hidden',
          paddingVertical: lg ? 16 : 12,
          paddingHorizontal: lg ? 24 : 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{
              fontFamily: lg ? 'DMSans_700Bold' : 'DMSans_600SemiBold',
              fontSize: lg ? 16 : 13,
              color: enabled ? '#FFFFFF' : C.textFaint,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </SpringPressable>
  );
}
