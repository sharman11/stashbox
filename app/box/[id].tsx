import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronRight, Flame, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CustomAlert } from '@/components/CustomAlert';
import { DragCoin } from '@/components/DragCoin';
import { MilestoneOverlay } from '@/components/MilestoneOverlay';
import { MoneyboxGrid } from '@/components/MoneyboxGrid';
import { ProgressRing } from '@/components/ProgressRing';
import { ShareCard } from '@/components/ShareCard';
import { SpringPressable } from '@/components/SpringPressable';
import { markTodayActive } from '@/components/StreakSection';
import { formatAmount } from '@/lib/currency';
import { useAlert } from '@/lib/use-alert';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useSoundEffect } from '@/lib/use-sound';
import { getTheme } from '@/lib/theme';
import type { Cell } from '@/lib/types';

// Fallback colors used before theme loads
const FALLBACK = { bg: '#F5F7FA', accent: '#1DB954' };

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

export default function MoneyboxDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { moneyboxes, cellsByMoneybox, streaks, loadCells, loadStreak, fillCell, abandonMoneybox } =
    useMoneyboxesStore();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const playCoinDrop = useSoundEffect('coin');
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [pendingCell, setPendingCell] = useState<Cell | null>(null);
  const [filling, setFilling] = useState(false);
  const [rowCelebration, setRowCelebration] = useState<number | null>(null);
  const passedMilestones = useRef(new Set<number>());

  const moneybox = moneyboxes.find((b) => b.id === id);
  const cells = id ? cellsByMoneybox[id] ?? [] : [];
  const streak = id ? streaks[id] : undefined;

  useEffect(() => {
    if (id && !cellsByMoneybox[id]) loadCells(id);
    if (id && !streaks[id]) loadStreak(id);
  }, [id, cellsByMoneybox, streaks, loadCells, loadStreak]);

  const { saved, pct, unfilled } = useMemo(() => {
    if (!moneybox) return { saved: 0, pct: 0, unfilled: [] as Cell[] };
    const savedAmt = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
    const unfilledCells = cells.filter((c) => !c.isFilled);
    return {
      saved: savedAmt,
      pct: moneybox.goalAmount > 0 ? Math.min(1, savedAmt / moneybox.goalAmount) : 0,
      unfilled: unfilledCells,
    };
  }, [moneybox, cells]);

  useEffect(() => {
    const pctInt = Math.round(pct * 100);
    for (const m of MILESTONES) {
      if (pctInt >= m) passedMilestones.current.add(m);
    }
  }, [cells.length > 0 && pct === 0]);

  const savedRef = useRef(saved);
  savedRef.current = saved;

  const suggestion = useMemo(() => {
    if (unfilled.length === 0) return null;
    const sorted = [...unfilled].sort((a, b) => a.amount - b.amount);
    const cutoff = Math.ceil(sorted.length * 0.5);
    const pickFromCheap = Math.random() < 0.7;
    const pool = pickFromCheap ? sorted.slice(0, cutoff) : sorted.slice(cutoff);
    return pool[Math.floor(Math.random() * pool.length)] ?? sorted[0];
  }, [unfilled.length]);

  const isCompleted = moneybox?.status === 'completed';

  const handleTap = useCallback(
    (cell: Cell) => {
      if (!moneybox || !id || isCompleted) return;
      setPendingCell(cell);
      showAlert(
        'Save today?',
        `Drop ${formatAmount(cell.amount, moneybox.currency)} into your moneybox?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setPendingCell(null) },
          { text: 'Save it', onPress: () => confirmFill(cell) },
        ],
        '💰',
      );
    },
    [moneybox, id, isCompleted, showAlert],
  );

  const confirmFill = useCallback(
    async (cell: Cell) => {
      if (!moneybox || !id) return;
      setFilling(true);
      setPendingCell(null);

      if (profile?.soundEnabled) playCoinDrop();

      const result = await fillCell(cell.id, id);
      setFilling(false);

      if (result.success) {
        markTodayActive(userId);
      }

      if (!result.success) {
        if (
          result.error &&
          result.error !== 'Already filling this cell' &&
          result.error !== 'Cell already filled'
        ) {
          showAlert('Save failed', 'Check your connection and try again.', undefined, '⚠️');
        }
        return;
      }

      const currentSaved = savedRef.current + cell.amount;
      const newPct = Math.round((currentSaved / moneybox.goalAmount) * 100);
      for (const m of MILESTONES) {
        if (newPct >= m && !passedMilestones.current.has(m)) {
          passedMilestones.current.add(m);
          setActiveMilestone(m);
          break;
        }
      }
    },
    [moneybox, id, fillCell, profile?.soundEnabled, playCoinDrop],
  );

  const theme = getTheme(moneybox?.theme ?? 'classic_gold');

  if (!moneybox) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  const hapticsEnabled = profile?.hapticsEnabled ?? true;
  const filledCount = cells.length - unfilled.length;
  const daysLeft = moneybox.targetDays - filledCount;
  const daysSinceCreation = Math.max(
    1,
    Math.floor((Date.now() - new Date(moneybox.createdAt).getTime()) / 86400000),
  );
  const expectedFilled = Math.min(daysSinceCreation, moneybox.targetDays);
  const daysAhead = filledCount - expectedFilled;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Compact gradient header ── */}
        <LinearGradient
          colors={[theme.heroGradientStart, theme.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 48 }}
        >
          {/* Back + vault name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, gap: 10 }}>
            <SpringPressable
              onPress={() => router.back()}
              style={{ justifyContent: 'center' }}
            >
              <ChevronLeft size={22} color={theme.textOnHero} />
            </SpringPressable>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.textOnHero }} numberOfLines={1}>
              {moneybox.name}
            </Text>
          </View>

          {/* Centered stats */}
          <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 4 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: theme.textOnHero, marginTop: 4 }}>
              {formatAmount(saved, moneybox.currency)}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textOnHeroSecondary, marginTop: 4 }}>
              of {formatAmount(moneybox.goalAmount, moneybox.currency)}
              {!isCompleted && daysLeft > 0 ? ` · ${daysLeft}d left` : ''}
            </Text>

            {/* Progress bar */}
            <View style={{ width: '60%', marginTop: 14 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', height: 6, borderRadius: 3 }}>
                <View
                  style={{
                    backgroundColor: isCompleted ? theme.success : theme.accent,
                    height: 6,
                    borderRadius: 3,
                    width: `${Math.round(pct * 100)}%`,
                  }}
                />
              </View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.textOnHeroSecondary, textAlign: 'center', marginTop: 6 }}>
                {Math.round(pct * 100)}%
              </Text>
            </View>

            {/* Days ahead/behind */}
            {!isCompleted && filledCount > 0 && (
              <View
                style={{
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor:
                    daysAhead > 0 ? 'rgba(34,197,94,0.2)' : daysAhead < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: theme.textOnHero }}>
                  {daysAhead > 0
                    ? `${daysAhead}d ahead`
                    : daysAhead < 0
                      ? `${Math.abs(daysAhead)}d behind`
                      : 'On track'}
                </Text>
              </View>
            )}
            {filling && (
              <ActivityIndicator size="small" color={theme.textOnHero} style={{ marginTop: 8 }} />
            )}
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
          {/* Completed */}
          {isCompleted && (
            <View
              style={{
                backgroundColor: theme.successBg,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: theme.textPrimary, marginTop: 8 }}>
                Goal complete!
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
                You saved {formatAmount(moneybox.goalAmount, moneybox.currency)} — every cell filled.
              </Text>
            </View>
          )}

          {isCompleted && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ShareCard
                moneybox={moneybox}
                savedAmount={saved}
                filledCells={cells.length - unfilled.length}
                totalCells={cells.length}
              />
            </View>
          )}

          {/* Streak + nudge card */}
          {!isCompleted && (
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 12,
                shadowColor: theme.shadowColor,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {streak && streak.currentDays > 0 ? (
                    <Flame size={16} color="#F59E0B" />
                  ) : (
                    <Zap size={16} color={theme.textMuted} />
                  )}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.textPrimary }}>
                    {streak?.currentDays ?? 0} day streak
                  </Text>
                  {streak && streak.bestDays > (streak.currentDays ?? 0) && (
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted }}>
                      · Best {streak.bestDays}
                    </Text>
                  )}
                </View>
              </View>
              {suggestion && (
                <>
                  <View style={{ height: 0.5, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
                  <View style={{ backgroundColor: theme.accentSoft, paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.accent }}>
                      Save <Text style={{ fontFamily: 'Inter_700Bold' }}>{formatAmount(suggestion.amount, moneybox.currency)}</Text> today
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Drag coin */}
          {!isCompleted && suggestion && (
            <DragCoin
              hapticsEnabled={hapticsEnabled}
              onDrop={() => { if (suggestion) confirmFill(suggestion); }}
            />
          )}

          {/* Grid */}
          <View style={{ marginTop: 4 }}>
            <MoneyboxGrid
              cells={cells}
              rows={moneybox.gridRows}
              cols={moneybox.gridCols}
              theme={theme}
              hapticsEnabled={hapticsEnabled}
              onTap={handleTap}
              onRowComplete={(rowIdx) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setRowCelebration(rowIdx);
                setTimeout(() => setRowCelebration(null), 2000);
              }}
            />
          </View>

          {/* Danger zone */}
          {moneybox.status === 'active' && (
            <View style={{ marginTop: 32 }}>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  color: theme.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                DANGER ZONE
              </Text>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.2)',
                  overflow: 'hidden',
                }}
              >
                <SpringPressable
                  onPress={() =>
                    showAlert('Abandon moneybox?', 'This cannot be undone. All progress will be lost.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Abandon', style: 'destructive', onPress: () => { abandonMoneybox(moneybox.id); router.back(); } },
                    ], '🗑️')
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: '#EF4444' }}>
                      Abandon this moneybox
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                      All progress will be lost
                    </Text>
                  </View>
                  <ChevronRight size={16} color="rgba(239,68,68,0.4)" />
                </SpringPressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Row celebration */}
      {rowCelebration !== null && (
        <View style={{
          position: 'absolute', left: 24, right: 24, bottom: 40,
          backgroundColor: theme.accentLight, borderRadius: 12, padding: 10,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          shadowColor: 'rgba(0,0,0,0.12)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
        }}>
          <Text style={{ fontSize: 16 }}>🎉</Text>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.accent }}>
            Row {rowCelebration + 1} complete!
          </Text>
        </View>
      )}

      <MilestoneOverlay milestone={activeMilestone} onDismiss={() => setActiveMilestone(null)} />
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}
