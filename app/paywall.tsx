import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';
import { getCurrentOffering, devSetPro, IAP_DUMMY, purchase, restore } from '@/lib/iap/purchases';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useAppTheme } from '@/lib/stores/theme';

const BENEFITS = [
  'Debt-free optimizer — see how extra payments cut months and interest',
  'Smart spending insights from your own data',
  'Advanced goal forecasting',
  'Support an indie app 🐿️',
];

function packageLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'ANNUAL':
      return 'Yearly';
    case 'MONTHLY':
      return 'Monthly';
    case 'WEEKLY':
      return 'Weekly';
    case 'LIFETIME':
      return 'Lifetime';
    default:
      return pkg.product.title || 'Stashbox+';
  }
}

export default function PaywallScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isPro = useEntitlement();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(!IAP_DUMMY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('paywall_viewed');
    if (IAP_DUMMY) return; // no offerings to load in dev mode
    let alive = true;
    getCurrentOffering().then((o) => {
      if (!alive) return;
      setOffering(o);
      setSelected(o?.availablePackages[0] ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onSubscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (IAP_DUMMY) {
        await devSetPro(true);
        track('subscribe_completed', { package: 'dev' });
        router.back();
        return;
      }
      if (!selected) return;
      const ok = await purchase(selected);
      if (ok) {
        track('subscribe_completed', { package: selected.identifier });
        router.back();
      }
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (IAP_DUMMY) {
        await devSetPro(false); // dev: deactivate to re-test the locked state
        router.back();
        return;
      }
      const ok = await restore();
      if (ok) {
        router.back();
      } else {
        Alert.alert('Nothing to restore', 'No active Stashbox+ purchase was found.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg, paddingTop: insets.top }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
        <SpringPressable
          onPress={() => router.back()}
          haptic
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceElevated }}
        >
          <X size={18} color={C.textSecondary} />
        </SpringPressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Sparkles size={22} color={C.accent} />
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 28, color: C.textPrimary, letterSpacing: -0.6 }}>
            Stashbox+
          </Text>
        </View>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textSecondary, marginTop: 8, lineHeight: 21 }}>
          Turn your numbers into decisions — and reach your goals faster.
        </Text>

        <View style={{ gap: 12, marginTop: 24 }}>
          {BENEFITS.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent + '1A', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Check size={14} color={C.accent} />
              </View>
              <Text style={{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textPrimary, lineHeight: 20 }}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 28, gap: 10 }}>
          {IAP_DUMMY ? (
            <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, backgroundColor: C.accent + '0D' }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.textPrimary }}>
                Developer mode
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 17 }}>
                RevenueCat isn’t configured yet. {isPro ? 'Stashbox+ is currently simulated as active.' : 'Activate to simulate a subscription and test the Stashbox+ features.'}
              </Text>
            </View>
          ) : loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          ) : !offering || offering.availablePackages.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textSecondary, textAlign: 'center', marginVertical: 16 }}>
              Subscriptions aren't available right now. Please try again later.
            </Text>
          ) : (
            offering.availablePackages.map((pkg) => {
              const active = selected?.identifier === pkg.identifier;
              return (
                <SpringPressable
                  key={pkg.identifier}
                  onPress={() => setSelected(pkg)}
                  haptic
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: active ? C.accent : C.border,
                    backgroundColor: active ? C.accent + '12' : C.surfaceElevated,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.textPrimary }}>
                    {packageLabel(pkg)}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>
                    {pkg.product.priceString}
                  </Text>
                </SpringPressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, gap: 12 }}>
        {!(IAP_DUMMY && isPro) && (
          <SpringPressable
            onPress={onSubscribe}
            haptic
            disabled={busy || (!IAP_DUMMY && !selected)}
            style={{
              backgroundColor: IAP_DUMMY || selected ? C.accent : C.border,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#FFFFFF' }}>
                {IAP_DUMMY ? 'Activate Stashbox+ (dev)' : 'Continue'}
              </Text>
            )}
          </SpringPressable>
        )}
        <SpringPressable onPress={onRestore} haptic disabled={busy} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}>
            {IAP_DUMMY ? (isPro ? 'Deactivate Stashbox+ (dev)' : 'Restore purchases') : 'Restore purchases'}
          </Text>
        </SpringPressable>
      </View>
    </View>
  );
}
