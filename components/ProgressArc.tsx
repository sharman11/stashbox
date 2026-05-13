import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressArcProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  textColor?: string;
}

export function ProgressArc({
  progress,
  size = 72,
  strokeWidth = 5,
  color = '#1DB954',
  trackColor = '#F0F2F5',
  label,
  textColor = '#0F1419',
}: ProgressArcProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={{ width: size, height: size / 2 + 8, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={size} height={size / 2 + strokeWidth} style={{ overflow: 'visible' }}>
        {/* Track - bottom half circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation="180"
          origin={`${size / 2}, ${size / 2}`}
        />
        {/* Progress - bottom half circle filled */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="180"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {label && (
        <Text style={{
          position: 'absolute', bottom: 0,
          fontFamily: 'DMSans_700Bold', fontSize: size * 0.2, color: textColor,
        }}>
          {label}
        </Text>
      )}
    </View>
  );
}
