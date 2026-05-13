import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, BounceIn } from 'react-native-reanimated';

import { useAppReadyStore } from '@/lib/stores/app-ready';
import { useAppTheme } from '@/lib/stores/theme';

const STORAGE_KEY = 'stashbox_last_daily_bonus';

const GREETINGS = [
  { emoji: '🌅', text: 'Good morning, saver!' },
  { emoji: '💪', text: 'Back at it!' },
  { emoji: '🔥', text: 'Consistency is key!' },
  { emoji: '✨', text: 'Another day, another save!' },
  { emoji: '🎯', text: 'Stay focused!' },
  { emoji: '🌟', text: 'You are doing great!' },
  { emoji: '💰', text: 'Time to save!' },
  { emoji: '🚀', text: 'Lets go!' },
];

export function DailyBonus() {
  const C = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [streak, setStreak] = useState(1);
  // Wait until the splash animation has finished before evaluating the bonus —
  // otherwise the Modal renders above the splash on Android and the user sees
  // a popup before they're "safely" on Home.
  const splashExited = useAppReadyStore((s) => s.splashExited);

  useEffect(() => {
    if (!splashExited) return;
    checkBonus();
  }, [splashExited]);

  const checkBonus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (stored === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const streakKey = 'stashbox_login_streak';
    const storedStreak = Number(await AsyncStorage.getItem(streakKey)) || 0;
    const newStreak = stored === yesterday ? storedStreak + 1 : 1;

    await AsyncStorage.setItem(STORAGE_KEY, today);
    await AsyncStorage.setItem(streakKey, String(newStreak));

    setStreak(newStreak);
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    setVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.overlay }}
      >
        <Animated.View
          entering={BounceIn.duration(400).delay(100)}
          style={{ width: '85%', maxWidth: 360 }}
        >
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              paddingTop: 32,
              paddingBottom: 24,
              paddingHorizontal: 28,
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
              <Text style={{ fontSize: 32 }}>{greeting.emoji}</Text>
            </View>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{
                alignSelf: 'stretch',
                fontFamily: 'DMSans_700Bold',
                fontSize: 20,
                lineHeight: 26,
                color: C.textPrimary,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              {greeting.text}
            </Text>
            {streak > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 8,
                  backgroundColor: C.warnBg,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.warnText }}>
                  {streak} day streak
                </Text>
              </View>
            )}

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
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}
              >
                Let&apos;s save!
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
