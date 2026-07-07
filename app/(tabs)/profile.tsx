import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Flame,
  Lock,
  LogOut,
  Pencil,
  PiggyBank,
  Star,
  Trash2,
  Trophy,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarPicker } from '@/components/AvatarPicker';
import { AvatarVisual } from '@/components/AvatarVisual';
import { useAvatarUnlocksStore } from '@/lib/stores/avatar-unlocks';
import { CustomAlert } from '@/components/CustomAlert';
import { SpringPressable } from '@/components/SpringPressable';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
import { deleteAccount } from '@/lib/auth';
import { BADGES, getBadge } from '@/lib/badges/catalog';
import { useBadgesStore } from '@/lib/badges/store';
import { titleForBadgeCount } from '@/lib/badges/titles';
import { CURRENCIES, formatAmount } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { usePlayedStore } from '@/lib/games/played';
import { GAMES } from '@/lib/games/registry';
import { useScoresStore } from '@/lib/games/scores';
import { useAdsStore } from '@/lib/stores/ads';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { resetUserScopedStores, useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import { useAlert } from '@/lib/use-alert';

interface Personality {
  type: string;
  emoji: string;
  desc: string;
}

export default function ProfileScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email, signOut } = useSessionStore();
  const { profile, update } = useProfileStore();
  const { moneyboxes, streaks, cellsByMoneybox, loadCells } = useMoneyboxesStore();

  // Make sure cells are loaded so the totals card has data even on a cold open.
  useEffect(() => {
    moneyboxes.forEach((b) => {
      if (!cellsByMoneybox[b.id]) loadCells(b.id);
    });
  }, [moneyboxes, cellsByMoneybox, loadCells]);
  const { id: avatarId, setAvatar } = useAvatarStore();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const adsReady = useAdsStore((s) => s.ready);
  const earnedBadges = useBadgesStore((s) => s.earned);
  const evaluateBadges = useBadgesStore((s) => s.evaluate);
  const bestScores = useScoresStore((s) => s.best);
  const playedSet = usePlayedStore((s) => s.played);
  const watchedAds = useAvatarUnlocksStore((s) => s.watched);
  const unlockAvatar = useAvatarUnlocksStore((s) => s.unlock);
  const earnedCount = Object.keys(earnedBadges).length;
  const avatarTitle = titleForBadgeCount(earnedCount);

  // Re-check moneybox-related badges whenever box state changes - this is the
  // entry point that retroactively unlocks streak / fill-count badges from
  // pre-existing data when the user first lands on the new Profile tab.
  useEffect(() => {
    const totalCellsFilled = Object.values(cellsByMoneybox).flat().filter((c) => c.isFilled).length;
    let highestProgress = 0;
    let anyBoxCompleted = false;
    for (const box of moneyboxes) {
      if (box.status === 'completed') anyBoxCompleted = true;
      const cells = cellsByMoneybox[box.id] ?? [];
      const saved = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
      const pct = box.goalAmount > 0 ? saved / box.goalAmount : 0;
      if (pct > highestProgress) highestProgress = pct;
    }
    const bestEverStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.bestDays ?? 0), 0);
    const bestCurrentStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.currentDays ?? 0), 0);
    evaluateBadges({
      totalCellsFilled,
      highestProgress,
      anyBoxCompleted,
      bestCurrentStreak,
      bestEverStreak,
      bestScores,
      played: playedSet,
    });
  }, [moneyboxes, cellsByMoneybox, streaks, bestScores, playedSet, evaluateBadges]);

  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState(profile?.displayName ?? '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Deep-linkable tab (e.g. Settings → Account pushes ?tab=account).
  const params = useLocalSearchParams<{ tab?: string }>();
  const isTab = (v: string | undefined): v is 'stats' | 'progress' | 'account' =>
    v === 'stats' || v === 'progress' || v === 'account';
  const [tab, setTab] = useState<'stats' | 'progress' | 'account'>(
    isTab(params.tab) ? params.tab : 'stats',
  );
  useEffect(() => {
    if (isTab(params.tab)) setTab(params.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab]);

  useEffect(() => {
    AsyncStorage.getItem('stashbox_personality').then((raw) => {
      if (!raw) return;
      try {
        setPersonality(JSON.parse(raw) as Personality);
      } catch {
        // Ignore corrupt cache.
      }
    });
  }, []);

  const completedBoxes = useMemo(
    () => moneyboxes.filter((b) => b.status === 'completed').length,
    [moneyboxes],
  );

  // Highest fill % across any moneybox - drives progress-based avatar unlocks.
  const highestProgress = useMemo(() => {
    let best = 0;
    for (const box of moneyboxes) {
      const cells = cellsByMoneybox[box.id] ?? [];
      const saved = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
      const pct = box.goalAmount > 0 ? saved / box.goalAmount : 0;
      if (pct > best) best = pct;
    }
    return best;
  }, [moneyboxes, cellsByMoneybox]);

  /** Total cells filled across every moneybox - drives cells-filled unlocks. */
  const cellsFilled = useMemo(
    () => Object.values(cellsByMoneybox).flat().filter((c) => c.isFilled).length,
    [cellsByMoneybox],
  );

  const bestStreakDays = useMemo(
    () => Object.values(streaks).reduce((max, s) => Math.max(max, s.bestDays ?? 0), 0),
    [streaks],
  );

  const currentStreakDays = useMemo(
    () => Object.values(streaks).reduce((max, s) => Math.max(max, s.currentDays ?? 0), 0),
    [streaks],
  );

  // Total saved per currency, summed across all boxes (active + completed).
  const totalsByCurrency = useMemo(() => {
    const acc = new Map<CurrencyCode, number>();
    for (const b of moneyboxes) {
      const cells = cellsByMoneybox[b.id] ?? [];
      const saved = cells
        .filter((c) => c.isFilled)
        .reduce((sum, c) => sum + c.amount, 0);
      if (saved <= 0) continue;
      acc.set(b.currency, (acc.get(b.currency) ?? 0) + saved);
    }
    return Array.from(acc.entries());
  }, [moneyboxes, cellsByMoneybox]);

  if (!profile) return null;

  const memberSince = formatMemberSince(profile.createdAt);

  const saveName = () => {
    update({ displayName: nameText.trim() || null });
    setEditingName(false);
  };

  const onLogOut = () => {
    showAlert(
      'Log out?',
      'Your data is saved and will be here when you come back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            useSessionStore.getState().setTransitioning(true);
            try {
              await signOut();
              // Logout lands the user on the onboarding carousel (welcome),
              // NOT the signup flow. Terminology in this codebase:
              //   "onboarding" = /(auth)/welcome (the 4-slide intro carousel)
              //   "signup flow" = /(auth)/signup (the 7-step stepper)
              router.replace('/(auth)/welcome');
            } finally {
              useSessionStore.getState().setTransitioning(false);
            }
          },
        },
      ],
      '👋',
    );
  };

  const onDelete = () => {
    showAlert(
      'Delete account?',
      'This will permanently delete your account, all stashboxes, and all saved data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            // Same shape as logout: transition guard, synchronous session
            // clear, wipe local stores, navigate explicitly. `deleting`
            // drives a full-screen overlay — the RPC + sign-out take a
            // couple of seconds and silence reads as "nothing happened".
            useSessionStore.getState().setTransitioning(true);
            setDeleting(true);
            try {
              await deleteAccount();
              useSessionStore.setState({ userId: null, isAnonymous: true, email: null });
              await resetUserScopedStores();
              router.replace('/(auth)/welcome');
            } catch (e: unknown) {
              showAlert(
                'Failed',
                e instanceof Error ? e.message : 'Could not delete account.',
                undefined,
                '⚠️',
              );
            } finally {
              setDeleting(false);
              useSessionStore.getState().setTransitioning(false);
            }
          },
        },
      ],
      '🗑️',
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Hero ── */}
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ paddingBottom: 60 }}
          >
            {/* Top bar - back button */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: insets.top + 12,
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
                PROFILE
              </Text>
            </View>

            {/* Avatar + name */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <SpringPressable
                onPress={() => setShowAvatarPicker((v) => !v)}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AvatarVisual avatar={avatarId} size={96} />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: C.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: C.heroBot,
                  }}
                >
                  <Pencil size={12} color="#FFFFFF" />
                </View>
              </SpringPressable>

              {/* Name is tappable — jumps to the Account tab with the editor
               *  open, so editing doesn't rely on finding the row later. */}
              <SpringPressable
                onPress={() => {
                  setNameText(profile.displayName ?? '');
                  setTab('account');
                  setEditingName(true);
                }}
                haptic
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 24,
                    color: '#FFFFFF',
                    marginTop: 16,
                    paddingHorizontal: 24,
                  }}
                >
                  {profile.displayName?.trim() || 'Set your name'}
                </Text>
              </SpringPressable>
              <View
                style={{
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              >
                <Star size={11} color="#FBBF24" fill="#FBBF24" />
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 11,
                    color: '#FFFFFF',
                    letterSpacing: 0.4,
                  }}
                >
                  {avatarTitle}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 8,
                  letterSpacing: 0.4,
                }}
              >
                MEMBER SINCE {memberSince.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
            {/* ── Segmented tab bar ── */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.borderLight,
                borderRadius: 14,
                padding: 4,
                marginBottom: 16,
                shadowColor: 'rgba(0,0,0,0.08)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 1,
              }}
            >
              {([
                { key: 'stats' as const, label: 'Stats' },
                { key: 'progress' as const, label: 'Progress' },
                { key: 'account' as const, label: 'Account' },
              ]).map((t) => {
                const active = tab === t.key;
                return (
                  <SpringPressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    haptic
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: active ? C.surface : 'transparent',
                      alignItems: 'center',
                      shadowColor: active ? 'rgba(0,0,0,0.1)' : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 4,
                      elevation: active ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: active ? 'DMSans_700Bold' : 'DMSans_500Medium',
                        fontSize: 13,
                        color: active ? C.textPrimary : C.textMuted,
                        letterSpacing: 0.2,
                      }}
                    >
                      {t.label}
                    </Text>
                  </SpringPressable>
                );
              })}
            </View>

            {/* ── Identity card: display name ── */}
            {tab === 'account' && (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 16,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              {editingName ? (
                <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginBottom: 6,
                    }}
                  >
                    Display name
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      value={nameText}
                      onChangeText={setNameText}
                      placeholder="Your name"
                      placeholderTextColor={C.textFaint}
                      autoFocus
                      style={{
                        flex: 1,
                        backgroundColor: C.borderLight,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 16,
                        fontFamily: 'DMSans_500Medium',
                        color: C.textPrimary,
                      }}
                      returnKeyType="done"
                      onSubmitEditing={saveName}
                    />
                    <Pressable
                      onPress={saveName}
                      style={{
                        backgroundColor: C.buttonPrimaryBg,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.buttonPrimaryText }}>
                        Save
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <SpringPressable
                  onPress={() => {
                    setNameText(profile.displayName ?? '');
                    setEditingName(true);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
                      Display name
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 16,
                        color: profile.displayName ? C.textPrimary : C.textFaint,
                        marginTop: 2,
                      }}
                    >
                      {profile.displayName || 'Tap to set'}
                    </Text>
                  </View>
                  <Pencil size={16} color={C.textFaint} />
                </SpringPressable>
              )}
            </View>
            )}

            {/* ── Personality badge ── */}
            {tab === 'stats' && personality && (
              <Card style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  YOUR SAVER PERSONALITY
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: C.accentLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{personality.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 18,
                        lineHeight: 24,
                        color: C.textPrimary,
                      }}
                    >
                      {personality.type}
                    </Text>
                    <Text
                      numberOfLines={3}
                      ellipsizeMode="tail"
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: C.textSecondary,
                        marginTop: 2,
                        lineHeight: 17,
                      }}
                    >
                      {personality.desc}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* ── Stats ── */}
            {tab === 'stats' && (
            <>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              YOUR JOURNEY
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <StatTile
                icon={<Trophy size={16} color="#F59E0B" />}
                label="Completed"
                value={String(completedBoxes)}
                tint="#F59E0B22"
              />
              <StatTile
                icon={<Flame size={16} color="#EF4444" />}
                label="Best streak"
                value={`${bestStreakDays}d`}
                tint="#EF444422"
              />
              <StatTile
                icon={<Flame size={16} color={C.accent} />}
                label="Current"
                value={`${currentStreakDays}d`}
                tint={C.accentLight}
              />
            </View>

            {/* Total saved per currency */}
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PiggyBank size={14} color={C.accent} />
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: 0.5,
                  }}
                >
                  TOTAL SAVED
                </Text>
              </View>
              {totalsByCurrency.length === 0 ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: C.textMuted,
                  }}
                >
                  Save your first cell to start tracking your total here.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {totalsByCurrency.map(([code, amount]) => (
                    <View
                      key={code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{CURRENCIES[code].flag}</Text>
                        <Text
                          style={{
                            fontFamily: 'DMSans_500Medium',
                            fontSize: 13,
                            color: C.textSecondary,
                          }}
                        >
                          {CURRENCIES[code].label}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 16,
                          color: C.textPrimary,
                        }}
                      >
                        {formatAmount(amount, code)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
            </>
            )}

            {/* ── Game scores ── */}
            {tab === 'progress' && (
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: 0.5,
                  }}
                >
                  GAME SCORES
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 11,
                    color: C.textMuted,
                  }}
                >
                  {GAMES.filter((g) => bestScores[g.id] != null).length} / {GAMES.length} played
                </Text>
              </View>
              {GAMES.map((g) => {
                const score = bestScores[g.id];
                const played = score != null;
                return (
                  <View
                    key={g.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: C.surface,
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginBottom: 8,
                      shadowColor: 'rgba(0,0,0,0.06)',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 6,
                      elevation: 1,
                    }}
                  >
                    {/* Logo tile in the game's tinted background */}
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: g.palette.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={g.image}
                        resizeMode="contain"
                        style={{ width: 28, height: 28 }}
                      />
                    </View>

                    {/* Name + scoreLabel context */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 14,
                          color: C.textPrimary,
                        }}
                        numberOfLines={1}
                      >
                        {g.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 11,
                          color: C.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {g.scoreLabel}
                      </Text>
                    </View>

                    {/* Score chip - accent-colored when played, muted when not */}
                    {played ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: g.palette.accent,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          minWidth: 64,
                          justifyContent: 'center',
                        }}
                      >
                        <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
                        <Text
                          style={{
                            fontFamily: 'DMSans_700Bold',
                            fontSize: 13,
                            color: '#FFFFFF',
                          }}
                          numberOfLines={1}
                        >
                          {score.toLocaleString()}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 11,
                          color: C.textFaint,
                          letterSpacing: 0.4,
                        }}
                      >
                        NOT PLAYED
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            )}

            {/* ── Badges ── */}
            {tab === 'progress' && (
              <BadgesCard earnedBadges={earnedBadges} earnedCount={earnedCount} />
            )}

            {/* ── Currencies ── */}
            {tab === 'account' && (
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: 0.5,
                  }}
                >
                  YOUR CURRENCIES
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.accent }}>
                    Manage
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {profile.preferredCurrencies.map((code, i) => {
                  const meta = CURRENCIES[code];
                  const isPrimary = i === 0;
                  return (
                    <View
                      key={code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: isPrimary ? C.buttonPrimaryBg : C.borderLight,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{meta.flag}</Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color: isPrimary ? C.buttonPrimaryText : C.textPrimary,
                        }}
                      >
                        {meta.code}
                      </Text>
                      {isPrimary && <Star size={10} color={C.buttonPrimaryText} fill={C.buttonPrimaryText} />}
                    </View>
                  );
                })}
              </View>
            </Card>
            )}

            {/* ── Account ── */}
            {tab === 'account' && (
            <>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              ACCOUNT
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
                  Signed in as
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 15,
                    color: C.textPrimary,
                    marginTop: 2,
                  }}
                >
                  {email ?? 'No email on file'}
                </Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
              {/* Log out is routine, not destructive — neutral styling so it
               *  can't be confused with delete-account below. */}
              <SpringPressable
                onPress={onLogOut}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: C.borderLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LogOut size={16} color={C.textSecondary} />
                </View>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: C.textPrimary, flex: 1 }}>
                  Log out
                </Text>
              </SpringPressable>
            </View>

            {/* Destructive action lives in its own card, pushed down and
             *  visually separated from routine account actions. */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginTop: 8,
                marginBottom: 24,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <SpringPressable
                onPress={onDelete}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#EF444422',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#EF4444' }}>
                    Delete account
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                    Permanently remove all data
                  </Text>
                </View>
              </SpringPressable>
            </View>

            </>
            )}

            {/* Banner ad - always visible, independent of active tab */}
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
      {/* Full-screen blocker while the account is being deleted — the RPC +
       *  sign-out span a few network calls and silence looks like a hang. */}
      {deleting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            zIndex: 100,
          }}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
            Deleting your account…
          </Text>
        </View>
      )}
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
      <AvatarPicker
        visible={showAvatarPicker}
        selected={avatarId}
        stats={{
          highestProgress,
          completedBoxes,
          bestStreak: bestStreakDays,
          cellsFilled,
          boxCount: moneyboxes.length,
          played: playedSet,
          scores: bestScores,
          watchedAds,
        }}
        onAdUnlock={unlockAvatar}
        onSelect={(id) => setAvatar(id)}
        onClose={() => setShowAvatarPicker(false)}
      />
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const C = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
}) {
  const C = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 12,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 18,
          color: C.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: C.textMuted,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function formatMemberSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } catch {
    return '-';
  }
}

/* ── Badges ─────────────────────────────────────────────────────── */

const BADGE_GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  box: { label: 'Money Box', icon: '🐷' },
  'coin-merge': { label: 'Coin Merge', icon: '🪙' },
  snake: { label: 'Snake', icon: '🐍' },
  'memory-match': { label: 'Memory Match', icon: '🧠' },
  'whack-a-coin': { label: 'Whack-a-Coin', icon: '🔨' },
  cross: { label: 'Cross-game', icon: '🌟' },
};

const BADGE_GROUP_ORDER: string[] = [
  'box',
  'coin-merge',
  'snake',
  'memory-match',
  'whack-a-coin',
  'cross',
];

interface BadgesCardProps {
  earnedBadges: Record<string, { unlockedAt: string }>;
  earnedCount: number;
}

function BadgesCard({ earnedBadges, earnedCount }: BadgesCardProps) {
  const C = useAppTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const total = BADGES.length;
  const progress = total > 0 ? earnedCount / total : 0;

  // Most recently unlocked - shown as a featured tile so the user has a
  // satisfying "what did I just earn" moment when they land on Profile.
  const latest = useMemo(() => {
    if (earnedCount === 0) return null;
    const sorted = Object.entries(earnedBadges).sort((a, b) =>
      a[1].unlockedAt < b[1].unlockedAt ? 1 : -1,
    );
    return getBadge(sorted[0][0]) ?? null;
  }, [earnedBadges, earnedCount]);

  // Group badges by category - much easier to scan than a flat 26-tile grid.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof BADGES[number][]>();
    for (const b of BADGES) {
      const arr = map.get(b.group) ?? [];
      arr.push(b);
      map.set(b.group, arr);
    }
    return BADGE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      label: BADGE_GROUP_LABELS[g]?.label ?? g,
      icon: BADGE_GROUP_LABELS[g]?.icon ?? '🏆',
      badges: map.get(g) ?? [],
    }));
  }, []);

  const selected = selectedId ? getBadge(selectedId) : null;
  const selectedEarned = selected ? !!earnedBadges[selected.id] : false;
  const selectedDate = selected && selectedEarned
    ? new Date(earnedBadges[selected.id].unlockedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            color: C.textMuted,
            letterSpacing: 0.5,
          }}
        >
          BADGES
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 13,
            color: C.accent,
          }}
        >
          {earnedCount} / {total}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: C.borderLight,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: C.accent,
            borderRadius: 3,
          }}
        />
      </View>

      {/* Latest unlocked - featured tile so the user feels rewarded */}
      {latest && (
        <Pressable
          onPress={() => setSelectedId(latest.id)}
          style={{
            backgroundColor: C.accentLight,
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: `${C.accent}33`,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 30 }}>{latest.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 10,
                color: C.accentDark,
                letterSpacing: 0.5,
              }}
            >
              JUST UNLOCKED
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 16,
                color: C.textPrimary,
                marginTop: 2,
              }}
            >
              {latest.name}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textSecondary,
                marginTop: 2,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {latest.description}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Grouped badge grid */}
      {grouped.map((g, idx) => {
        const groupEarned = g.badges.filter((b) => !!earnedBadges[b.id]).length;
        return (
          <View key={g.group} style={{ marginTop: idx === 0 ? 0 : 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 14 }}>{g.icon}</Text>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 12,
                  color: C.textSecondary,
                  letterSpacing: 0.3,
                  flex: 1,
                }}
              >
                {g.label}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                {groupEarned}/{g.badges.length}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {g.badges.map((b) => {
                const earned = !!earnedBadges[b.id];
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setSelectedId(b.id)}
                    style={{
                      width: '22%',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 14,
                        backgroundColor: earned ? C.accentLight : C.borderLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: earned ? 1.5 : 0,
                        borderColor: earned ? 'rgba(29,185,84,0.25)' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 24,
                          // Locked badges show the same icon at low opacity so
                          // the user sees what's available - much more
                          // motivating than a generic lock glyph.
                          opacity: earned ? 1 : 0.28,
                        }}
                      >
                        {b.icon}
                      </Text>
                      {!earned && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: C.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Lock size={9} color={C.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 10,
                        color: earned ? C.textPrimary : C.textMuted,
                        textAlign: 'center',
                        marginTop: 6,
                        lineHeight: 13,
                      }}
                      numberOfLines={2}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Detail sheet for the tapped badge */}
      <Modal
        transparent
        animationType="fade"
        visible={selected != null}
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable
          onPress={() => setSelectedId(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              maxWidth: 320,
              width: '100%',
            }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 26,
                backgroundColor: selectedEarned ? C.accentLight : C.borderLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 44, opacity: selectedEarned ? 1 : 0.35 }}>
                {selected?.icon}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 10,
                letterSpacing: 1,
                color: selectedEarned ? C.accentDark : C.textMuted,
                marginBottom: 4,
              }}
            >
              {selectedEarned ? 'UNLOCKED' : 'LOCKED'}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 20,
                color: C.textPrimary,
                textAlign: 'center',
              }}
            >
              {selected?.name}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: C.textSecondary,
                marginTop: 6,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {selected?.description}
            </Text>
            {selectedDate && (
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 14,
                }}
              >
                Earned · {selectedDate}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}
