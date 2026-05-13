import { ChevronRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import type { Cell, Moneybox } from '@/lib/types';

interface MoneyboxCardProps {
  moneybox: Moneybox;
  cells: Cell[];
  savedAmount: number;
  onPress: () => void;
}

function getAccentColor(pct: number): string {
  if (pct >= 0.8) return '#22C55E';
  if (pct >= 0.5) return '#F59E0B';
  return '#1DB954';
}

export function MoneyboxCard({ moneybox, cells, savedAmount, onPress }: MoneyboxCardProps) {
  // Defensive: clamp to [0, 1] and bail to 0 on NaN/negative-goal corruption
  // so the progress bar never renders width: -%/NaN%/200%.
  const ratio = moneybox.goalAmount > 0 ? savedAmount / moneybox.goalAmount : 0;
  const pct = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const filledCount = cells.filter((c) => c.isFilled).length;
  const daysLeft = moneybox.targetDays - filledCount;
  const accentColor = getAccentColor(pct);

  return (
    <SpringPressable
      onPress={onPress}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
      }}
    >
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: '#0F1419' }} numberOfLines={1}>
            {moneybox.name}
          </Text>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: '#0F1419', marginTop: 4 }}>
            {formatAmount(savedAmount, moneybox.currency)}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {Math.round(pct * 100)}% of {formatAmount(moneybox.goalAmount, moneybox.currency)}
            {daysLeft > 0 ? ` · ${daysLeft}d left` : ' · Done'}
          </Text>
          <View style={{ backgroundColor: '#F3F4F6', height: 4, borderRadius: 2, marginTop: 10 }}>
            <View style={{ backgroundColor: accentColor, height: 4, borderRadius: 2, width: `${pct * 100}%` }} />
          </View>
        </View>
        <ChevronRight size={18} color="#D1D5DB" style={{ marginLeft: 8 }} />
      </View>
    </SpringPressable>
  );
}
