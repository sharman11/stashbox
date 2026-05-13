import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatter: (n: number) => string;
  style?: TextStyle;
  /** Constrain to a single line and shrink to fit the container if the
   *  formatted value would otherwise overflow. */
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  /** Lower bound for adjustsFontSizeToFit (1.0 = no shrink, 0.5 = 50%). */
  minimumFontScale?: number;
  allowFontScaling?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 800,
  formatter,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  allowFontScaling,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startValue = display;
    const diff = value - startValue;
    if (diff === 0) return;

    const steps = 30;
    const stepDuration = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + diff * eased));

      if (step >= steps) {
        clearInterval(timer);
        setDisplay(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      allowFontScaling={allowFontScaling}
    >
      {formatter(display)}
    </Text>
  );
}
