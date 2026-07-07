import { useRouter } from 'expo-router';
import { Plus, Settings, Wallet } from 'lucide-react-native';
import { ImageBackground, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarVisual } from '@/components/AvatarVisual';
import { SpringPressable } from '@/components/SpringPressable';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * Empty-state hero for brand-new users with nothing logged yet. Sized to the
 * exact 3:4 box HomeHero uses, so when data arrives the swap to the real
 * hero is a content change inside identical geometry instead of a full-page
 * layout jump (the "glitch" right after account creation). Cards render
 * below it, same as the populated home.
 */
export function EmptyHero() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { profile } = useProfileStore();
  const avatarId = useAvatarStore((s) => s.id);

  const trimmedName = profile?.displayName?.trim() ?? '';
  const heading = trimmedName ? `Welcome, ${trimmedName}` : 'Welcome';

  // Match HomeHero: fixed 3:4 portrait box (height = width × 4/3).
  const heroHeight = Math.round(screenWidth * (4 / 3));

  return (
    <View style={{ backgroundColor: C.heroTop }}>
      <ImageBackground
        source={require('@/assets/home/empty-hero-bg.webp')}
        resizeMode="cover"
        // 3:4 matches the illustration's native aspect, so the scene (hills,
        // mascot, stash tree) sits fully inside the frame.
        style={{
          height: heroHeight,
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

        {/* Welcome copy — sits in the upper green sky where white text has
         *  strong contrast, clear of the artwork below. */}
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
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 20,
              marginTop: 10,
            }}
          >
            {`Save toward what matters and keep an eye on where your money goes. Start with either. It only takes a minute.`}
          </Text>

          {/* CTAs — 40px below the subtext. Two equal-width rounded pills side
           *  by side: saving is primary (solid white), tracking spending is
           *  the quieter ghost alternative. */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 40,
              gap: 12,
            }}
          >
          <SpringPressable
            onPress={() => router.push('/create')}
            haptic
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            <Plus size={17} color={C.heroTop} strokeWidth={2.5} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 15,
                color: C.heroTop,
              }}
            >
              Save
            </Text>
          </SpringPressable>

          <SpringPressable
            onPress={() => router.push('/expenses/edit')}
            haptic
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderRadius: 999,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.55)',
            }}
          >
            <Wallet size={17} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 15,
                color: '#FFFFFF',
              }}
            >
              Track
            </Text>
          </SpringPressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
