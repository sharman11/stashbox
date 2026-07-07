import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { useAppTheme } from '@/lib/stores/theme';

export interface BarDatum {
  key: string;
  label: string;
  /** Always >= 0. */
  value: number;
  /** Optional override color for this bar (e.g. current month accent). */
  color?: string;
}

interface BarChartProps {
  data: readonly BarDatum[];
  width: number;
  height?: number;
  /** Default bar color when datum.color is unset. */
  color?: string;
  /** Optional formatter for the label rendered above the bar. */
  formatValue?: (v: number) => string;
  /** When set, each bar column becomes tappable (full-height hit area). */
  onBarPress?: (key: string) => void;
  /** When set, only this bar shows its value label and its axis label is
   *  emphasized — one focused number instead of six competing ones. */
  selectedKey?: string;
  /** Draw a dashed reference line at the mean of the non-zero bars. */
  showAverage?: boolean;
}

/**
 * Simple vertical bar chart with auto-scaled Y axis and bottom labels.
 * No grid lines — keeps the chart visually quiet for a list-heavy screen.
 */
export function BarChart({
  data,
  width,
  height = 160,
  color = '#10B981',
  formatValue,
  onBarPress,
  selectedKey,
  showAverage,
}: BarChartProps) {
  const C = useAppTheme();
  if (data.length === 0) return null;

  // Average of months that have data — zero months (pre-signup, no logs)
  // would drag the reference line down to meaninglessness.
  const nonZero = data.filter((d) => d.value > 0);
  const avg =
    showAverage && nonZero.length >= 2
      ? nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length
      : null;

  const max = Math.max(1, ...data.map((d) => d.value), avg ?? 0);
  const paddingX = 8;
  const paddingTop = 20;
  const paddingBottom = 28;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;
  const slotW = chartW / data.length;
  const barW = Math.min(28, slotW * 0.55);
  const avgY = avg !== null ? paddingTop + (1 - avg / max) * chartH : 0;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const x = paddingX + i * slotW + (slotW - barW) / 2;
          const h = (d.value / max) * chartH;
          const y = paddingTop + (chartH - h);
          return (
            <Rect
              key={d.key}
              x={x}
              y={y}
              width={barW}
              height={Math.max(2, h)}
              rx={4}
              fill={d.color ?? color}
              opacity={d.value === 0 ? 0.25 : 1}
            />
          );
        })}
        {avg !== null && (
          <Line
            x1={paddingX}
            y1={avgY}
            x2={width - paddingX}
            y2={avgY}
            stroke={C.textMuted}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.55}
          />
        )}
      </Svg>
      {/* Average label — hugs the right end of the dashed line. */}
      {avg !== null && (
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: paddingX,
            top: Math.max(0, avgY - 15),
            fontFamily: 'DMSans_500Medium',
            fontSize: 9,
            color: C.textMuted,
          }}
        >
          avg {formatValue ? formatValue(avg) : Math.round(avg).toString()}
        </Text>
      )}
      {/* Value labels above bars */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: paddingTop,
          flexDirection: 'row',
        }}
      >
        {data.map((d) => {
          // With a selection, only the focused bar carries its number —
          // six competing labels read as noise, one reads as an answer.
          const hidden = d.value === 0 || (selectedKey ? d.key !== selectedKey : false);
          if (hidden) return <View key={d.key} style={{ flex: 1 }} />;
          return (
            <View key={d.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 10,
                  color: C.textSecondary,
                }}
              >
                {formatValue ? formatValue(d.value) : Math.round(d.value).toString()}
              </Text>
            </View>
          );
        })}
      </View>
      {/* X-axis labels */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: paddingBottom,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {data.map((d) => {
          const selected = selectedKey === d.key;
          return (
            <View key={d.key} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: selected ? 'DMSans_700Bold' : 'DMSans_500Medium',
                  fontSize: 11,
                  color: selected ? C.textPrimary : C.textMuted,
                }}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Tap targets — one full-height column per bar, over everything. */}
      {onBarPress && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
          }}
        >
          {data.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => onBarPress(d.key)}
              accessibilityLabel={`Select ${d.label}`}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
