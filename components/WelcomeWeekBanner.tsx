import { Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { daysBetween, todayDateString } from '@/lib/streak-freeze';
import { useAppTheme } from '@/lib/stores/theme';

interface WelcomeWeekBannerProps {
  /** ISO date when the user's first cell was filled. Banner only renders when set. */
  startedAt: string | null;
  /** Profile flag — if true the banner hides forever. */
  complete: boolean;
  /** Best streak across all boxes. Used to show "you're already on day X". */
  bestStreakDays: number;
}

const TARGET_DAYS = 7;

/**
 * Shown on the home screen during the user's first 7 days of saving.
 * Anchors them to the day-7 activation milestone (per Duolingo retention data:
 * users with 7+ day streaks are 3.6× more likely to stay long-term).
 *
 * Rendering rules:
 *  - Hidden when `complete` is true (set when day-7 hits OR explicitly cleared).
 *  - Hidden when `startedAt` is null (user hasn't filled their first cell yet).
 *  - Auto-hides after 7 calendar days even if streak hasn't hit 7 — at that
 *    point the banner has done its job and the user is in normal flow.
 *  - Shows current best streak day, capped at TARGET_DAYS for the progress bar.
 */
export function WelcomeWeekBanner({ startedAt, complete, bestStreakDays }: WelcomeWeekBannerProps) {
  const C = useAppTheme();

  if (complete || !startedAt) return null;

  const elapsedDays = Math.max(0, daysBetween(startedAt, todayDateString()));
  if (elapsedDays >= TARGET_DAYS) return null;

  const dayInArc = Math.max(1, Math.min(TARGET_DAYS, bestStreakDays || 1));
  // Defensive clamp — if bestStreakDays is somehow NaN or otherwise off the
  // 1..TARGET_DAYS rail, the bar would render `width: NaN%` (RN logs a
  // warning + fills 100% silently) or overflow the track.
  const rawPct = (dayInArc / TARGET_DAYS) * 100;
  const progressPct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : 0;

  return (
    <View
      style={{
        backgroundColor: C.accentLight,
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 14,
            color: C.accentDark,
          }}
        >
          {dayInArc >= TARGET_DAYS
            ? 'Day 7 — almost there!'
            : `Welcome week · day ${dayInArc} of ${TARGET_DAYS}`}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textSecondary,
            marginTop: 2,
            lineHeight: 16,
          }}
        >
          {dayInArc >= TARGET_DAYS
            ? 'Save today to lock it in. A free streak freeze is waiting.'
            : 'The first 7 days are the hardest. Save today to keep going.'}
        </Text>
        <View
          style={{
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.55)',
            borderRadius: 2,
            marginTop: 10,
          }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: C.accent,
              width: `${progressPct}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}
