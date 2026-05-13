import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { useAppTheme } from '@/lib/stores/theme';

/** Identifier for which celebration to show. 100 = goal completion (legacy);
 *  'day-7' / 'day-10' = welcome-arc streak milestones. */
export type MilestoneKind = 100 | 'day-7' | 'day-10';

interface MilestoneOverlayProps {
  milestone: MilestoneKind | null;
  onDismiss: () => void;
  /** Optional CTA - shown only on goal completion to nudge a new vault. */
  onCreateNewVault?: () => void;
  /** Fires when the modal becomes visible - use to play a celebration sound. */
  onShow?: () => void;
}

interface CelebrationContent {
  emoji: string;
  title: string;
  subtitle: string;
}

const CONTENT: Record<MilestoneKind, CelebrationContent> = {
  100: {
    emoji: '🏆',
    title: 'Goal complete!',
    subtitle: 'Every cell filled.',
  },
  'day-7': {
    emoji: '🎉',
    title: '7 days in. You did it.',
    subtitle:
      'Most people quit before today. You\'re a saver now — plus a free streak freeze, on the house.',
  },
  'day-10': {
    emoji: '🛡️',
    title: '10-day streak',
    subtitle: 'Past the danger zone. The data says you\'re sticking with it.',
  },
};

export function MilestoneOverlay({ milestone, onDismiss, onCreateNewVault, onShow }: MilestoneOverlayProps) {
  const C = useAppTheme();
  const confettiRef = useRef<ConfettiCannon>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (milestone) setVisible(true);
  }, [milestone]);

  const handleDismiss = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVisible(false);
    onDismiss();
  };

  const handleCreate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVisible(false);
    onDismiss();
    onCreateNewVault?.();
  };

  if (!milestone || !visible) return null;
  const content = CONTENT[milestone];

  return (
    <Modal transparent animationType="fade" visible={visible} onShow={onShow}>
      <Pressable
        onPress={handleDismiss}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.overlay }}
      >
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            paddingTop: 36,
            paddingBottom: 28,
            paddingHorizontal: 28,
            marginHorizontal: 32,
            // Cap on landscape / tablet so the modal doesn't stretch full
            // width and turn the CTA into an awkward 700pt-wide bar.
            maxWidth: 380,
            alignSelf: 'center',
            alignItems: 'center',
            shadowColor: 'rgba(0,0,0,0.12)',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 1,
            shadowRadius: 32,
            elevation: 8,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: C.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 36 }}>{content.emoji}</Text>
          </View>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              alignSelf: 'stretch',
              fontFamily: 'DMSans_700Bold',
              fontSize: 22,
              lineHeight: 28,
              color: C.textPrimary,
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            {content.title}
          </Text>
          <Text
            numberOfLines={4}
            ellipsizeMode="tail"
            style={{
              alignSelf: 'stretch',
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              lineHeight: 20,
              color: C.textSecondary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {content.subtitle}
          </Text>
          {onCreateNewVault ? (
            <>
              <Pressable
                onPress={handleCreate}
                style={{
                  backgroundColor: C.buttonPrimaryBg,
                  borderRadius: 14,
                  paddingVertical: 14,
                  marginTop: 24,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}
                >
                  Create new vault
                </Text>
              </Pressable>
              <Pressable onPress={handleDismiss} style={{ marginTop: 12, paddingVertical: 8 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textSecondary }}>
                  Maybe later
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleDismiss}
              style={{
                backgroundColor: C.buttonPrimaryBg,
                borderRadius: 14,
                paddingVertical: 14,
                marginTop: 24,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}>
                Done
              </Text>
            </Pressable>
          )}
        </View>
        <ConfettiCannon
          ref={confettiRef}
          count={milestone === 100 ? 200 : milestone === 'day-7' ? 140 : 100}
          origin={{ x: -10, y: 0 }}
          autoStart
          fadeOut
          explosionSpeed={350}
          fallSpeed={3000}
          colors={['#1DB954', '#4ADE80', '#86EFAC', '#FFFFFF', '#FBBF24']}
        />
      </Pressable>
    </Modal>
  );
}
