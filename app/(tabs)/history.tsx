import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
import { useAdsStore } from '@/lib/stores/ads';
import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/* ── Chime palette ─────────────────────────────────────────────── */

export default function HistoryScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { userId } = useSessionStore();
  const { moneyboxes, streaks, loadAll } = useMoneyboxesStore();
  const { profile } = useProfileStore();
  const adsReady = useAdsStore((s) => s.ready);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'completed' | 'abandoned'>('completed');

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId, loadAll]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadAll(userId, true);
    setRefreshing(false);
  }, [userId, loadAll]);

  const completed = moneyboxes
    .filter((b) => b.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const abandoned = moneyboxes.filter((b) => b.status === 'abandoned');
  const totalCompleted = completed.reduce((s, b) => s + b.goalAmount, 0);
  const bestStreak = Math.max(0, ...Object.values(streaks).map((s) => s.bestDays));

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            colors={[C.accent]}
          />
        }
      >
        {/* ── Green gradient header ── */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 52 }}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ paddingHorizontal: 20, paddingTop: 56 }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              History
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 34,
                color: '#FFFFFF',
                marginTop: 4,
              }}
            >
              {completed.length > 0
                ? `${completed.length} vault${completed.length !== 1 ? 's' : ''} completed`
                : 'Your journey'}
            </Text>
            {completed.length > 0 && (
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: '#4ADE80',
                  marginTop: 8,
                }}
              >
                {formatAmount(totalCompleted, profile?.defaultCurrency ?? 'USD')} saved in total
              </Text>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ── Stats card (overlapping) ── */}
        {completed.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ paddingHorizontal: 16, marginTop: -28 }}
          >
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                justifyContent: 'space-around',
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 24,
                    color: C.textPrimary,
                  }}
                >
                  {completed.length}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    marginTop: 2,
                  }}
                >
                  Completed
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: C.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 24,
                    color: C.textPrimary,
                  }}
                >
                  {bestStreak}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    marginTop: 2,
                  }}
                >
                  Best streak
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: C.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 24,
                    color: C.textPrimary,
                  }}
                >
                  {abandoned.length}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    marginTop: 2,
                  }}
                >
                  Abandoned
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Empty state ── */}
        {completed.length === 0 && abandoned.length === 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ paddingHorizontal: 16, marginTop: -28 }}
          >
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                paddingVertical: 40,
                paddingHorizontal: 24,
                alignItems: 'center',
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#E6F4EA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Trophy size={24} color={C.accent} />
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 16,
                  color: C.textPrimary,
                }}
              >
                Nothing here yet
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: C.textSecondary,
                  textAlign: 'center',
                  marginTop: 6,
                  lineHeight: 20,
                }}
              >
                Completed vaults will appear here. Keep saving!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Segmented control ── */}
        {(completed.length > 0 || abandoned.length > 0) && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={{ paddingHorizontal: 16, marginTop: 24 }}
          >
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.border,
                borderRadius: 12,
                padding: 3,
                marginBottom: 16,
              }}
            >
              {(['completed', 'abandoned'] as const).map((t) => {
                const isActive = tab === t;
                const count = t === 'completed' ? completed.length : abandoned.length;
                return (
                  <SpringPressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={{
                      flex: 1,
                      backgroundColor: isActive ? C.surface : 'transparent',
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      shadowColor: isActive ? 'rgba(0,0,0,0.08)' : 'transparent',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 1,
                      shadowRadius: 4,
                      elevation: isActive ? 1 : 0,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      style={{
                        fontFamily: isActive ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
                        fontSize: 14,
                        color: isActive ? C.textPrimary : C.textMuted,
                      }}
                    >
                      {t === 'completed' ? 'Completed' : 'Abandoned'}{count > 0 ? ` (${count})` : ''}
                    </Text>
                  </SpringPressable>
                );
              })}
            </View>

            {/* ── List ── */}
            {tab === 'completed' && completed.length > 0 && (
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
                {completed.map((box, i) => {
                  const date = box.completedAt
                    ? new Date(box.completedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <SpringPressable
                      key={box.id}
                      onPress={() => router.push(`/box/${box.id}`)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        gap: 12,
                        borderTopWidth: i > 0 ? 0.5 : 0,
                        borderTopColor: C.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: '#E6F4EA',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trophy size={18} color={C.accent} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontFamily: 'DMSans_600SemiBold',
                            fontSize: 15,
                            color: C.textPrimary,
                          }}
                        >
                          <Text>{box.icon || '💰'} </Text>
                          {box.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontFamily: 'DMSans_400Regular',
                            fontSize: 13,
                            color: C.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {formatAmount(box.goalAmount, box.currency)}
                          {date ? ` · ${date}` : ''}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={C.textFaint} style={{ flexShrink: 0 }} />
                    </SpringPressable>
                  );
                })}
              </View>
            )}

            {tab === 'completed' && completed.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textPrimary }}>
                  No completed vaults yet
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 18,
                  }}
                >
                  Finish your first vault and it will land here.
                </Text>
              </View>
            )}

            {tab === 'abandoned' && abandoned.length > 0 && (
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
                {abandoned.map((box, i) => (
                  <SpringPressable
                    key={box.id}
                    onPress={() => router.push(`/box/${box.id}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      gap: 12,
                      borderTopWidth: i > 0 ? 0.5 : 0,
                      borderTopColor: C.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: C.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>📦</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 15,
                          color: C.textPrimary,
                        }}
                      >
                        <Text>{box.icon || '💰'} </Text>
                        {box.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 13,
                          color: C.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {formatAmount(box.goalAmount, box.currency)}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={C.textFaint} style={{ flexShrink: 0 }} />
                  </SpringPressable>
                ))}
              </View>
            )}

            {tab === 'abandoned' && abandoned.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textPrimary }}>
                  No abandoned vaults
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 18,
                  }}
                >
                  Nice — you’ve stuck with every vault you started.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* AdMob banner */}
        {adsReady && (
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <BannerAd
              unitId={AD_UNIT_IDS.BANNER}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
