import { Text } from 'react-native';

const QUOTES = [
  'Small amounts become big savings.',
  'Consistency beats intensity.',
  'Every cell filled is a step forward.',
  'Your future self will thank you.',
  'One day at a time.',
  'The best time to save was yesterday. The next best is today.',
  'Discipline is choosing between what you want now and what you want most.',
];

export function MotivationalText() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <Text style={{
      fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#9CA3AF',
      fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 32,
    }}>
      {`“${quote}”`}
    </Text>
  );
}
