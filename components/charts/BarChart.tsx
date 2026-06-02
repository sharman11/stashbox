import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

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
}: BarChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.value));
  const paddingX = 8;
  const paddingTop = 20;
  const paddingBottom = 28;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;
  const slotW = chartW / data.length;
  const barW = Math.min(28, slotW * 0.55);

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
      </Svg>
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
        {data.map((d, i) => {
          if (d.value === 0) return <View key={d.key} style={{ flex: 1 }} />;
          return (
            <View key={d.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 10,
                  color: '#374151',
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
        {data.map((d) => (
          <View key={d.key} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                color: '#6B7280',
              }}
            >
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
