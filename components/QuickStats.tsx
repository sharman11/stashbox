import { Calendar, Flame, Grid3x3 } from 'lucide-react-native';
import { Text, View } from 'react-native';

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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color={color} />
      </View>
      <View>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#0F1419' }}>{value}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#9CA3AF' }}>{label}</Text>
      </View>
    </View>
  );
}

export function QuickStats({ cellsFilledToday, streakDays, percentComplete }: QuickStatsProps) {
  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 12, flex: 1,
      shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    }}>
      <StatRow icon={Grid3x3} color="#1DB954" bg="#E6F4EA" value={`${cellsFilledToday}`} label="today" />
      <StatRow icon={Flame} color="#F59E0B" bg="#FEF3C7" value={`${streakDays}d`} label="streak" />
      <StatRow icon={Calendar} color="#22C55E" bg="#F0FDF4" value={`${percentComplete}%`} label="done" />
    </View>
  );
}
