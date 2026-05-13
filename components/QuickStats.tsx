import { Calendar, Flame, Grid3x3 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/lib/stores/theme';

interface QuickStatsProps {
  cellsFilledToday: number;
  streakDays: number;
  percentComplete: number;
}

function StatRow({ icon: Icon, color, bg, value, label }: {
  icon: typeof Flame;
  color: string;
  bg: string;
  value: string;
  label: string;
}) {
  const C = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color={color} />
      </View>
      <View>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>{value}</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: C.textMuted }}>{label}</Text>
      </View>
    </View>
  );
}

export function QuickStats({ cellsFilledToday, streakDays, percentComplete }: QuickStatsProps) {
  const C = useAppTheme();
  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 12, flex: 1,
      shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    }}>
      <StatRow icon={Grid3x3} color={C.accent} bg={C.accentLight} value={`${cellsFilledToday}`} label="today" />
      <StatRow icon={Flame} color={C.warnText} bg={C.warnBg} value={`${streakDays}d`} label="streak" />
      <StatRow icon={Calendar} color={C.accent} bg={C.successBg} value={`${percentComplete}%`} label="done" />
    </View>
  );
}
