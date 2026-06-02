import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

export interface DonutSlice {
  /** Stable identity (e.g. category id). */
  key: string;
  /** Positive value. Slices auto-normalize to a percentage of the sum. */
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: readonly DonutSlice[];
  /** Outer diameter in pixels. */
  size?: number;
  /** Thickness of the ring as a fraction of radius. 0.35 ≈ Apple Health style. */
  thicknessRatio?: number;
  /** Optional content rendered inside the donut hole. */
  centerLabel?: React.ReactNode;
}

/**
 * Hand-rolled donut chart using react-native-svg. No additional deps.
 *
 * Renders a colored arc per slice. When only one slice has value, we fall
 * back to a full Circle (simpler than a 360° arc, which is degenerate for
 * SVG arc commands).
 */
export function DonutChart({
  slices,
  size = 220,
  thicknessRatio = 0.35,
  centerLabel,
}: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = size / 2;
  const thickness = radius * thicknessRatio;
  const innerRadius = radius - thickness;
  const cx = radius;
  const cy = radius;

  const positive = slices.filter((s) => s.value > 0);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track ring (rendered behind slices so empty data still shows a ring) */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius - thickness / 2}
          stroke="#E5E7EB"
          strokeWidth={thickness}
          fill="none"
        />
        {total > 0 && (
          <G>
            {positive.length === 1 ? (
              // Single full slice — draw a stroked circle to avoid arc degeneracy.
              <Circle
                cx={cx}
                cy={cy}
                r={radius - thickness / 2}
                stroke={positive[0].color}
                strokeWidth={thickness}
                fill="none"
              />
            ) : (
              positive.reduce<{ start: number; nodes: React.ReactNode[] }>(
                (acc, slice) => {
                  const sweep = (slice.value / total) * Math.PI * 2;
                  const end = acc.start + sweep;
                  const path = arcPath(cx, cy, radius - thickness / 2, acc.start, end);
                  acc.nodes.push(
                    <Path
                      key={slice.key}
                      d={path}
                      stroke={slice.color}
                      strokeWidth={thickness}
                      fill="none"
                      strokeLinecap="butt"
                    />,
                  );
                  acc.start = end;
                  return acc;
                },
                { start: -Math.PI / 2, nodes: [] }, // start at 12 o'clock
              ).nodes
            )}
          </G>
        )}
      </Svg>
      {centerLabel && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: innerRadius * 2,
            height: innerRadius * 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {centerLabel}
        </View>
      )}
    </View>
  );
}

interface DonutLegendProps {
  slices: readonly (DonutSlice & { label: string; sub?: string })[];
}

export function DonutLegend({ slices }: DonutLegendProps) {
  if (slices.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {slices.map((s) => (
        <View
          key={s.key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: s.color,
            }}
          />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, flex: 1 }}
            >
              {s.label}
            </Text>
            {s.sub && (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: '#6B7280',
                }}
              >
                {s.sub}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Arc path math
 *
 * SVG arcs are gnarly: the `A` command needs a large-arc flag that flips
 * for sweeps > 180°. We compose the path as MoveTo start point → Arc to end.
 * ──────────────────────────────────────────────────────────────────── */

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const x0 = cx + r * Math.cos(start);
  const y0 = cy + r * Math.sin(start);
  const x1 = cx + r * Math.cos(end);
  const y1 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  const sweep = 1; // clockwise
  return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1} ${y1}`;
}
