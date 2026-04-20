import * as Sharing from 'expo-sharing';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { formatAmount } from '@/lib/currency';
import type { Moneybox } from '@/lib/types';

interface ShareCardProps {
  moneybox: Moneybox;
  savedAmount: number;
  filledCells: number;
  totalCells: number;
}

export function ShareCard({ moneybox, savedAmount, filledCells, totalCells }: ShareCardProps) {
  const viewRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    try {
      const uri = await viewRef.current?.capture?.();
      if (!uri) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your progress' });
    } catch {
      // Sharing cancelled or failed
    }
  };

  const pct = moneybox.goalAmount > 0 ? Math.round((savedAmount / moneybox.goalAmount) * 100) : 0;
  const isCompleted = moneybox.status === 'completed';

  return (
    <View>
      <ViewShot ref={viewRef} options={{ format: 'png', quality: 1 }}>
        <View
          style={{
            backgroundColor: '#0B3D2E',
            borderRadius: 20,
            padding: 24,
            width: 320,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#1DB954',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' }}>S</Text>
            </View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 13 }}>Stashbox</Text>
          </View>

          {isCompleted && (
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🏆</Text>
          )}

          <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 20, textAlign: 'center' }}>
            {moneybox.name}
          </Text>

          <Text style={{ fontFamily: 'Inter_700Bold', color: '#4ADE80', fontSize: 32, textAlign: 'center', marginTop: 8 }}>
            {formatAmount(savedAmount, moneybox.currency)}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            {isCompleted ? 'Goal reached!' : `of ${formatAmount(moneybox.goalAmount, moneybox.currency)}`}
          </Text>

          <View style={{ marginTop: 16, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: isCompleted ? '#22C55E' : '#1DB954', width: `${pct}%` }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {pct}% · {filledCells}/{totalCells} cells
            </Text>
            <Text style={{ fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {moneybox.targetDays} days
            </Text>
          </View>
        </View>
      </ViewShot>

      <Pressable
        onPress={handleShare}
        style={{
          backgroundColor: '#1DB954',
          borderRadius: 14,
          paddingVertical: 14,
          marginTop: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
          Share progress
        </Text>
      </Pressable>
    </View>
  );
}
