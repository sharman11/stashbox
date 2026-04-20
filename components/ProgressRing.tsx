import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  textColor?: string;
  sublabelColor?: string;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 10,
  color = '#1DB954',
  trackColor = '#F0F2F5',
  label,
  sublabel,
  textColor = '#0F1419',
  sublabelColor = '#9CA3AF',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="absolute items-center" style={{ maxWidth: size * 0.6 }}>
        {label && (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: textColor, fontSize: size * 0.16, fontFamily: 'Inter_700Bold' }}
          >
            {label}
          </Text>
        )}
        {sublabel && (
          <Text
            style={{
              color: sublabelColor,
              fontSize: size * 0.08,
              fontFamily: 'Inter_500Medium',
              marginTop: 2,
            }}
          >
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
}
