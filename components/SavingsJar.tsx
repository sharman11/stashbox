import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Rect, ClipPath } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SavingsJarProps {
  progress: number;
  size?: number;
  color?: string;
}

export function SavingsJar({ progress, size = 100, color = '#1DB954' }: SavingsJarProps) {
  const fillHeight = useSharedValue(0);
  const clampedProgress = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    fillHeight.value = withTiming(clampedProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress, fillHeight]);

  const jarWidth = size * 0.7;
  const jarHeight = size * 0.75;
  const neckWidth = size * 0.35;
  const neckHeight = size * 0.15;
  const lidWidth = size * 0.45;
  const cx = size / 2;

  // Jar body path
  const bodyLeft = (size - jarWidth) / 2;
  const bodyRight = bodyLeft + jarWidth;
  const bodyTop = neckHeight + 4;
  const bodyBottom = bodyTop + jarHeight;
  const r = 12;

  const jarPath = `
    M ${cx - neckWidth / 2} 0
    L ${cx + neckWidth / 2} 0
    L ${cx + neckWidth / 2} ${bodyTop}
    Q ${bodyRight} ${bodyTop} ${bodyRight} ${bodyTop + r}
    L ${bodyRight} ${bodyBottom - r}
    Q ${bodyRight} ${bodyBottom} ${bodyRight - r} ${bodyBottom}
    L ${bodyLeft + r} ${bodyBottom}
    Q ${bodyLeft} ${bodyBottom} ${bodyLeft} ${bodyBottom - r}
    L ${bodyLeft} ${bodyTop + r}
    Q ${bodyLeft} ${bodyTop} ${cx - neckWidth / 2} ${bodyTop}
    Z
  `;

  const fillMaxHeight = jarHeight + neckHeight;

  const animatedFillProps = useAnimatedProps(() => {
    const h = fillHeight.value * fillMaxHeight;
    return {
      y: bodyBottom - h,
      height: h,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <ClipPath id="jarClip">
            <Path d={jarPath} />
          </ClipPath>
          <SvgGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.7" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Jar outline */}
        <Path
          d={jarPath}
          fill="none"
          stroke="#D1D5DB"
          strokeWidth={2}
        />

        {/* Fill liquid */}
        <AnimatedRect
          x={0}
          width={size}
          fill="url(#fillGrad)"
          clipPath="url(#jarClip)"
          animatedProps={animatedFillProps}
        />

        {/* Lid */}
        <Rect
          x={cx - lidWidth / 2}
          y={0}
          width={lidWidth}
          height={4}
          rx={2}
          fill="#9CA3AF"
        />
      </Svg>
    </View>
  );
}
