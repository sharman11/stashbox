import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface MilestoneOverlayProps {
  milestone: 25 | 50 | 75 | 100 | null;
  onDismiss: () => void;
}

const MILESTONE_CONTENT: Record<number, { emoji: string; title: string; subtitle: string }> = {
  25: { emoji: '🌱', title: 'Quarter way!', subtitle: '25% saved — great start.' },
  50: { emoji: '🔥', title: 'Halfway there!', subtitle: '50% saved — keep it up.' },
  75: { emoji: '🚀', title: 'Almost!', subtitle: '75% saved — so close.' },
  100: { emoji: '🏆', title: 'Goal complete!', subtitle: 'Every cell filled.' },
};

const AUTO_DISMISS_MS = 5000;

export function MilestoneOverlay({ milestone, onDismiss }: MilestoneOverlayProps) {
  const confettiRef = useRef<ConfettiCannon>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (milestone) {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [milestone, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVisible(false);
    onDismiss();
  };

  if (!milestone || !visible) return null;

  const content = MILESTONE_CONTENT[milestone];

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable
        onPress={handleDismiss}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            paddingTop: 36,
            paddingBottom: 28,
            paddingHorizontal: 28,
            marginHorizontal: 32,
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
              backgroundColor: '#E6F4EA',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 36 }}>{content.emoji}</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: '#0F1419', marginTop: 16 }}>
            {content.title}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
            {content.subtitle}
          </Text>
          <Pressable
            onPress={handleDismiss}
            style={{
              backgroundColor: '#1DB954',
              borderRadius: 14,
              paddingVertical: 14,
              marginTop: 24,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
              {milestone === 100 ? 'Done' : 'Continue'}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#D1D5DB', marginTop: 12 }}>
            Tap anywhere to dismiss
          </Text>
        </View>
        <ConfettiCannon
          ref={confettiRef}
          count={milestone === 100 ? 200 : 80}
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
