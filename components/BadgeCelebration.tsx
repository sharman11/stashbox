import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { getBadge } from '@/lib/badges/catalog';
import { useBadgesStore } from '@/lib/badges/store';
import { useAppReadyStore } from '@/lib/stores/app-ready';

const C = {
  accent: '#1DB954',
  accentDark: '#166534',
  accentLight: '#E6F4EA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  overlay: 'rgba(11, 61, 46, 0.92)',
};

/**
 * Mounted at the root once. Watches the celebration queue and renders a
 * confetti + reveal modal whenever a new badge unlocks. User taps Continue
 * to acknowledge and the next queued badge (if any) appears.
 */
export function BadgeCelebration() {
  const next = useBadgesStore((s) => s.celebrationQueue[0]);
  const acknowledge = useBadgesStore((s) => s.acknowledgeCelebration);
  // Hold the celebration until the splash animation has fully exited — Modal
  // renders above the splash on Android, so a badge queued during boot would
  // flash on top of the wordmark animation.
  const splashExited = useAppReadyStore((s) => s.splashExited);

  // Defensive: if a stale id ends up in the queue (catalog changed mid-update)
  // just dismiss it instead of getting stuck.
  useEffect(() => {
    if (next && !getBadge(next)) acknowledge();
  }, [next, acknowledge]);

  const badge = next ? getBadge(next) : undefined;
  if (!badge || !splashExited) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={acknowledge}>
      <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ConfettiCannon
            count={180}
            origin={{ x: -10, y: 0 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={3000}
            colors={['#1DB954', '#4ADE80', '#86EFAC', '#FBBF24', '#FFFFFF']}
          />
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 12,
          }}
        >
          BADGE UNLOCKED
        </Text>

        <View
          style={{
            width: 128,
            height: 128,
            borderRadius: 36,
            backgroundColor: C.surface,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 1,
            shadowRadius: 32,
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 64 }}>{badge.icon}</Text>
        </View>

        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          ellipsizeMode="tail"
          style={{
            alignSelf: 'stretch',
            maxWidth: 380,
            fontFamily: 'DMSans_700Bold',
            fontSize: 28,
            lineHeight: 34,
            color: '#FFFFFF',
            marginTop: 24,
            textAlign: 'center',
            letterSpacing: -0.3,
          }}
        >
          {badge.name}
        </Text>
        <Text
          numberOfLines={4}
          ellipsizeMode="tail"
          style={{
            alignSelf: 'stretch',
            maxWidth: 380,
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 10,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {badge.description}
        </Text>

        <Pressable
          onPress={acknowledge}
          style={{
            marginTop: 36,
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 48,
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: '#FFFFFF' }}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
