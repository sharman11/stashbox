import { useRouter } from 'expo-router';
import { Plus, Settings } from 'lucide-react-native';
import { ImageBackground, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarVisual } from '@/components/AvatarVisual';
import { SpringPressable } from '@/components/SpringPressable';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * Hero replacement for brand-new users with no active goals. The illustrated
 * background (squirrel + acorn valley) carries the emotional welcome; text
 * and CTA overlay on the calm upper portion of the image.
 */
export function EmptyHero() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfileStore();
  const avatarId = useAvatarStore((s) => s.id);

  const trimmedName = profile?.displayName?.trim() ?? '';
  const heading = trimmedName ? `Welcome, ${trimmedName}` : 'Welcome';

  return (
    <View style={{ backgroundColor: C.heroTop }}>
      <ImageBackground
        source={require('@/assets/home/empty-hero-bg.webp')}
        resizeMode="cover"
        // 3:4 portrait — matches the illustration's native aspect so the
        // foreground scene (hills, acorns, mascot, stash tree) sits inside
        // the visible frame regardless of device width.
        style={{
          aspectRatio: 3 / 4,
          paddingTop: insets.top + 12,
        }}
      >
        {/* Top chrome: avatar (left) + settings (right) — identical to HomeHero. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
          }}
        >
          <SpringPressable
            onPress={() => router.push('/(tabs)/profile')}
            haptic
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <AvatarVisual avatar={avatarId} size={36} />
          </SpringPressable>

          <SpringPressable
            onPress={() => router.push('/(tabs)/settings')}
            haptic
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Settings size={18} color="#FFFFFF" />
          </SpringPressable>
        </View>

        {/* Welcome block — anchored in the upper portion where the green sky
         *  gives white text strong contrast. Below ~60% the illustration's
         *  cream-peach horizon takes over, which would compete with text. */}
        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 28,
              color: '#FFFFFF',
              letterSpacing: -0.5,
            }}
          >
            {heading}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 14,
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 20,
              marginTop: 10,
            }}
          >
            {`Pick something you're saving for and watch it fill up, one tap at a time. Setting up your first goal takes about a minute.`}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 22 }}>
            <SpringPressable
              onPress={() => router.push('/create')}
              haptic
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                paddingVertical: 14,
                paddingHorizontal: 28,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              <Plus size={16} color={C.heroTop} />
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 15,
                  color: C.heroTop,
                }}
              >
                Create your first goal
              </Text>
            </SpringPressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
