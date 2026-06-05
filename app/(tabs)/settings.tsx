import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as StoreReview from 'expo-store-review';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Coins,
  Moon,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Volume2,
  Vibrate,
  Wallpaper,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomAlert } from '@/components/CustomAlert';
import { MultiCurrencyPicker } from '@/components/MultiCurrencyPicker';
import { SpringPressable } from '@/components/SpringPressable';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
import { CURRENCIES } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { requestAndRegisterNotifications, unregisterNotifications } from '@/lib/push';
import { useAdsStore } from '@/lib/stores/ads';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { usePersonalizationStore, type HeroBackground } from '@/lib/stores/personalization';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme, useThemeStore } from '@/lib/stores/theme';
import type { AppMode } from '@/lib/theme/tokens';
import { useAlert } from '@/lib/use-alert';

export default function SettingsScreen() {
  const C = useAppTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useSessionStore();
  const { profile, update } = useProfileStore();
  const { moneyboxes } = useMoneyboxesStore();
  const adsReady = useAdsStore((s) => s.ready);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  if (!profile) return null;

  // Currencies that are "in use" by an active moneybox - can't be removed from preferred list.
  const lockedCurrencies = Array.from(
    new Set(moneyboxes.filter((m) => m.status === 'active').map((m) => m.currency)),
  );

  // Union of preferred + currently-active currencies so legacy data is always represented.
  const displayedCurrencies: CurrencyCode[] = (() => {
    const seen = new Set<CurrencyCode>(profile.preferredCurrencies);
    const out = [...profile.preferredCurrencies];
    for (const c of lockedCurrencies) {
      if (!seen.has(c)) {
        out.push(c);
        seen.add(c);
      }
    }
    return out;
  })();

  const onCurrenciesChange = async (next: CurrencyCode[]) => {
    if (next.length === 0) return;
    try {
      await update({
        defaultCurrency: next[0],
        preferredCurrencies: next,
      });
    } catch (e: unknown) {
      // Without this the user changes a currency, sees the picker close, and
      // has no idea the change didn't persist (network drop, supabase 5xx).
      showAlert(
        'Could not save currencies',
        e instanceof Error ? e.message : 'Try again in a moment.',
        undefined,
        '⚠️',
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Chime gradient hero ── */}
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingHorizontal: 24,
              paddingTop: insets.top + 16,
              paddingBottom: 56,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: 1,
              }}
            >
              SETTINGS
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 28,
                color: '#FFFFFF',
                marginTop: 6,
                letterSpacing: -0.3,
              }}
            >
              Tweak Stashbox
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              Currencies, sound, reminders, and backups.
            </Text>
          </LinearGradient>

          <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
            {/* ── Currencies (overlaps into gradient) ── */}
            <Card>
              <SpringPressable
                onPress={() => setShowCurrencyPicker((v) => !v)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <IconBadge tint={C.accentLight}>
                  <Coins size={16} color={C.accent} />
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Your currencies
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {profile.preferredCurrencies.map((code, i) => {
                      const meta = CURRENCIES[code];
                      const isPrimary = i === 0;
                      return (
                        <View
                          key={code}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: isPrimary ? C.buttonPrimaryBg : C.borderLight,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>{meta.flag}</Text>
                          <Text
                            style={{
                              fontFamily: 'DMSans_600SemiBold',
                              fontSize: 11,
                              color: isPrimary ? C.buttonPrimaryText : C.textPrimary,
                            }}
                          >
                            {meta.code}
                          </Text>
                          {isPrimary && <Star size={9} color={C.buttonPrimaryText} fill={C.buttonPrimaryText} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
                {showCurrencyPicker ? (
                  <ChevronUp size={16} color={C.textFaint} />
                ) : (
                  <ChevronDown size={16} color={C.textFaint} />
                )}
              </SpringPressable>

              {showCurrencyPicker && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 4,
                    paddingBottom: 16,
                    borderTopWidth: 0.5,
                    borderTopColor: C.borderLight,
                    backgroundColor: C.borderLight,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 12,
                      marginBottom: 8,
                      lineHeight: 18,
                    }}
                  >
                    Tap a chip to make it primary. Long-press to remove. Currencies in active moneyboxes are locked.
                  </Text>
                  <MultiCurrencyPicker
                    selected={displayedCurrencies}
                    onChange={onCurrenciesChange}
                    lockedCodes={lockedCurrencies}
                    showCapHelper={false}
                  />
                </View>
              )}
            </Card>

            {/* ── Appearance ── */}
            <SectionHeader>APPEARANCE</SectionHeader>
            <Card>
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
                <AppearanceSegmented />
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    marginTop: 10,
                    lineHeight: 18,
                  }}
                >
                  Dark mode applies to the app. Each moneybox keeps its own theme - pick the Midnight theme when creating one if you want it dark too.
                </Text>
              </View>
            </Card>

            {/* ── Personalization ── */}
            <SectionHeader>PERSONALIZATION</SectionHeader>
            <Card>
              <PersonalizationRows />
            </Card>

            {/* ── Preferences ── */}
            <SectionHeader>PREFERENCES</SectionHeader>
            <Card>
              <SwitchRow
                icon={<Volume2 size={16} color={C.accent} />}
                tint={C.accentLight}
                title="Sound effects"
                subtitle="Coin drop sounds when saving"
                value={profile.soundEnabled}
                onChange={(v) => update({ soundEnabled: v })}
              />
              <Divider />
              <SwitchRow
                icon={<Vibrate size={16} color="#7C3AED" />}
                tint="#EDE9FE"
                title="Haptic feedback"
                subtitle="Vibrate on interactions"
                value={profile.hapticsEnabled}
                onChange={(v) => update({ hapticsEnabled: v })}
              />
              <Divider />
              <SwitchRow
                icon={<Bell size={16} color="#F59E0B" />}
                tint="#FEF3C7"
                title="Daily reminders"
                subtitle="Get nudged if you forget to save"
                value={notificationsEnabled}
                onChange={async (v) => {
                  if (!userId) return;
                  if (v) {
                    const granted = await requestAndRegisterNotifications(userId);
                    setNotificationsEnabled(granted);
                  } else {
                    await unregisterNotifications(userId);
                    setNotificationsEnabled(false);
                  }
                }}
              />
            </Card>

            {/* ── Support ── */}
            <SectionHeader>SUPPORT</SectionHeader>
            <Card>
              <SpringPressable onPress={() => StoreReview.requestReview()} style={rowStyle}>
                <IconBadge tint="#FEF3C7">
                  <Star size={16} color="#F59E0B" />
                </IconBadge>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary, flex: 1 }}>
                  Rate Stashbox
                </Text>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>

              <Divider />

              <SpringPressable
                onPress={() => {
                  import('react-native').then(({ Share }) =>
                    Share.share({
                      message:
                        'Check out Stashbox - a fun way to save money daily! https://stashbox.app',
                    }),
                  );
                }}
                style={rowStyle}
              >
                <IconBadge tint="#EDE9FE">
                  <Share2 size={16} color="#7C3AED" />
                </IconBadge>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary, flex: 1 }}>
                  Share with friends
                </Text>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>
            </Card>

            {/* ── More from Optruvian ── */}
            <SectionHeader>MORE FROM OPTRUVIAN</SectionHeader>
            <Card>
              <SpringPressable
                onPress={() => Linking.openURL('https://www.hotlist-jobs.com')}
                style={rowStyle}
              >
                <IconBadge tint="#FEF2F2">
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Hotlist Jobs
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>Fresh tech jobs, verified daily</Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>

              <Divider />

              <SpringPressable
                onPress={() => Linking.openURL('https://www.optruvian.com')}
                style={rowStyle}
              >
                <IconBadge tint={C.accentLight}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Optruvian
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>Simple tools that just work</Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>
            </Card>

            {/* Legal */}
            <SpringPressable
              onPress={() => Linking.openURL('https://www.optruvian.com/privacy')}
              style={{ alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
                Privacy Policy
              </Text>
            </SpringPressable>

            {/* Version. If expoConfig is malformed (rare prebuild edge case)
                we'd rather hide the version than show a misleading 1.0.0. */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {Constants.expoConfig?.version && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textFaint }}>
                  Stashbox v{Constants.expoConfig.version}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 10,
                  color: C.textMuted,
                  marginTop: 4,
                  letterSpacing: 0.5,
                }}
              >
                from Optruvian
              </Text>
            </View>

            {/* Banner */}
            {adsReady && (
              <View style={{ marginTop: 20 }}>
                <BannerAd
                  unitId={AD_UNIT_IDS.BANNER}
                  size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

/* ── Small helpers ───────────────────────────────────────────── */

const rowStyle = {
  paddingHorizontal: 16,
  paddingVertical: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  const C = useAppTheme();
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: C.textMuted,
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const C = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  const C = useAppTheme();
  return <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />;
}

function IconBadge({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

function AppearanceSegmented() {
  const C = useAppTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const options: { value: AppMode; label: string; Icon: typeof Sun }[] = [
    { value: 'system', label: 'System', Icon: Smartphone },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.borderLight,
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map(({ value, label, Icon }) => {
        const selected = mode === value;
        return (
          <SpringPressable
            key={value}
            onPress={() => {
              if (!selected) setMode(value);
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: selected ? C.surface : 'transparent',
              shadowColor: selected ? 'rgba(0,0,0,0.08)' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selected ? 1 : 0,
              shadowRadius: 4,
              elevation: selected ? 1 : 0,
            }}
          >
            <Icon size={14} color={selected ? C.accent : C.textMuted} />
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: selected ? C.textPrimary : C.textMuted,
              }}
            >
              {label}
            </Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

interface SwitchRowProps {
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function SwitchRow({ icon, tint, title, subtitle, value, onChange }: SwitchRowProps) {
  const C = useAppTheme();
  return (
    <View style={rowStyle}>
      <IconBadge tint={tint}>{icon}</IconBadge>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
          {title}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Personalization section rows
 * ──────────────────────────────────────────────────────────────────── */

interface HeroBgOption {
  key: HeroBackground;
  label: string;
  /** Static thumbnail; omitted for the gradient `default`. */
  source?: number;
}

const HERO_BG_OPTIONS: readonly HeroBgOption[] = [
  { key: 'default', label: 'Gradient' },
  { key: 'painted-frame', label: 'Painted', source: require('@/assets/home/hero-frame-bg.webp') },
  { key: 'meadow', label: 'Meadow', source: require('@/assets/home/hero-meadow-bg.webp') },
  { key: 'leaf-frame', label: 'Leaf', source: require('@/assets/home/hero-leaf-frame-bg.webp') },
  { key: 'forest-peek', label: 'Forest', source: require('@/assets/home/hero-forest-peek-bg.webp') },
];

function PersonalizationRows() {
  const C = useAppTheme();
  const heroBackground = usePersonalizationStore((s) => s.heroBackground);
  const setHeroBackground = usePersonalizationStore((s) => s.setHeroBackground);
  const hydrate = usePersonalizationStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <View style={[rowStyle, { alignItems: 'flex-start' }]}>
        <IconBadge tint={C.accentLight}>
          <Wallpaper size={16} color={C.accent} />
        </IconBadge>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
            Hero background
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            Pick the look for your home header
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {HERO_BG_OPTIONS.map((opt) => {
              const selected = heroBackground === opt.key;
              return (
                <SpringPressable
                  key={opt.key}
                  onPress={() => setHeroBackground(opt.key)}
                  haptic
                  style={{ alignItems: 'center', gap: 6 }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 86,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: selected ? C.accent : C.border,
                    }}
                  >
                    {opt.source ? (
                      <Image
                        source={opt.source}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#06291F', '#145A42', '#1A8A66', '#2A9B72']}
                        locations={[0, 0.35, 0.75, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
                      fontSize: 11,
                      color: selected ? C.accent : C.textMuted,
                    }}
                  >
                    {opt.label}
                  </Text>
                </SpringPressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Divider />

      {/* Placeholder for future personalization options */}
      <View style={[rowStyle, { opacity: 0.55 }]}>
        <IconBadge tint={C.accentLight}>
          <Sparkles size={16} color={C.accent} />
        </IconBadge>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary }}>
            More personalizations
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              marginTop: 2,
            }}
          >
            Coming soon
          </Text>
        </View>
      </View>
    </>
  );
}
