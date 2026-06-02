import { useRouter } from 'expo-router';
import { CreditCard, PiggyBank, Receipt } from 'lucide-react-native';
import { Fragment } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { useAppTheme } from '@/lib/stores/theme';

interface QuickAction {
  key: string;
  label: string;
  Icon: typeof Receipt;
  href: string;
}

const ACTIONS: readonly QuickAction[] = [
  { key: 'expense', label: 'Log expense', Icon: Receipt, href: '/expenses/edit' },
  { key: 'save', label: 'Add to goal', Icon: PiggyBank, href: '/(tabs)/stash' },
  { key: 'payment', label: 'Record payment', Icon: CreditCard, href: '/(tabs)/loans' },
];

/**
 * Three fast paths to the core write actions, presented as a single segmented
 * bar (hairline dividers between equal segments) so it reads as one tidy
 * control rather than three competing boxes. A launchpad, not an alert.
 */
export function QuickActions() {
  const router = useRouter();
  const C = useAppTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(220)}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: C.surfaceElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
      }}
    >
      {ACTIONS.map(({ key, label, Icon, href }, i) => (
        <Fragment key={key}>
          {i > 0 && <View style={{ width: 1, backgroundColor: C.border, marginVertical: 12 }} />}
          <SpringPressable
            onPress={() => router.push(href as never)}
            haptic
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 6,
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Icon size={20} color={C.accent} />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 12,
                color: C.textPrimary,
                letterSpacing: -0.1,
              }}
            >
              {label}
            </Text>
          </SpringPressable>
        </Fragment>
      ))}
    </Animated.View>
  );
}
