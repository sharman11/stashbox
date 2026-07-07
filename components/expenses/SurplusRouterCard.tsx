import { useRouter } from 'expo-router';
import { PiggyBank, TrendingUp } from 'lucide-react-native';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useAppTheme } from '@/lib/stores/theme';

/** Don't nudge for trivial amounts (~10 units of the home currency). */
const MIN_SURPLUS_CENTS = 1_000;

interface SurplusRouterCardProps {
  /** This month's income − expenses, in home-currency cents. */
  surplusCents: number;
  currency: CurrencyCode;
  /** Outer spacing lives here so a null render adds no phantom margins. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Expenses → Stash bridge. When the user spent less than they earned this
 * month, offer to route the leftover toward a savings goal before it slips
 * away. Suggest-don't-automate: the CTA opens the goal flow. Reuses the
 * expenses-tab card styling.
 */
export function SurplusRouterCard({ surplusCents, currency, style }: SurplusRouterCardProps) {
  const C = useAppTheme();
  const router = useRouter();

  if (surplusCents < MIN_SURPLUS_CENTS) return null;

  const fundGoal = () => router.push('/create' as never);

  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.accentLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={18} color={C.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>
            You&apos;re {formatAmount(surplusCents / 100, currency)} ahead this month
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              marginTop: 2,
              lineHeight: 17,
            }}
          >
            Money in beat money out. Put it to work before it slips away.
          </Text>
        </View>
      </View>

      <SpringPressable
        haptic
        onPress={fundGoal}
        style={{
          backgroundColor: C.buttonPrimaryBg,
          borderRadius: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <PiggyBank size={15} color={C.buttonPrimaryText} />
        <Text
          style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.buttonPrimaryText }}
          numberOfLines={1}
        >
          Save toward a goal
        </Text>
      </SpringPressable>
    </View>
  );
}
