import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface DragCoinProps {
  onDrop: (x: number, y: number) => void;
  hapticsEnabled: boolean;
}

export function DragCoin({ onDrop, hapticsEnabled }: DragCoinProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [dragging, setDragging] = useState(false);

  const startX = width / 2 - 24;

  const triggerHaptic = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDrop = (x: number, y: number) => {
    onDrop(x, y);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.3);
      runOnJS(setDragging)(true);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const dropX = startX + e.translationX + 24;
      const dropY = e.absoluteY;
      runOnJS(handleDrop)(dropX, dropY);

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      runOnJS(setDragging)(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>
        {dragging ? 'Drop on a cell!' : 'Drag coin to save'}
      </Text>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            animatedStyle,
            {
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#E6F4EA',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: 'rgba(29,185,84,0.2)',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 4,
              borderWidth: 2,
              borderColor: '#1DB954',
            },
          ]}
        >
          <Text style={{ fontSize: 24 }}>🪙</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
