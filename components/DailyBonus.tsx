import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, BounceIn } from 'react-native-reanimated';

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
  const [visible, setVisible] = useState(false);
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    checkBonus();
  }, []);

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

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Animated.View entering={BounceIn.duration(400).delay(100)}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              paddingTop: 32,
              paddingBottom: 24,
              paddingHorizontal: 28,
              alignItems: 'center',
              width: 300,
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
              <Text style={{ fontSize: 32 }}>{greeting.emoji}</Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: '#0F1419',
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
                  backgroundColor: '#FEF3C7',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#B45309' }}>
                  {streak} day streak
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => setVisible(false)}
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
                Let's save!
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
