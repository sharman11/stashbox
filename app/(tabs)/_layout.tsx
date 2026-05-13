import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Clock, Gamepad2, Home, Settings, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/stores/theme';

const PILL_SPRING = { damping: 11, stiffness: 180, mass: 0.7 };
const ICON_SPRING = { damping: 10, stiffness: 220, mass: 0.6 };
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 };

function TabIcon({
  icon: Icon,
  color,
  focused,
  activeBg,
}: {
  icon: typeof Home;
  color: string;
  focused: boolean;
  activeBg: string;
}) {
  // Pill background fades + scales in when the tab becomes active. Rendered
  // as an absolute layer behind the icon so the outer container's geometry
  // never shifts — neighbouring tabs stay rock-steady when focus changes.
  const pillProgress = useSharedValue(focused ? 1 : 0);
  // Icon pops on focus: 1 → 1.25 → 1 via withSequence so the user gets a
  // strong tactile cue. Combined with translateY (-3 when focused) the active
  // icon visibly "lifts" out of the row.
  const iconScale = useSharedValue(focused ? 1 : 1);
  const iconLift = useSharedValue(focused ? -3 : 0);

  useEffect(() => {
    pillProgress.value = withSpring(focused ? 1 : 0, PILL_SPRING);
    iconLift.value = withSpring(focused ? -2 : 0, ICON_SPRING);
    if (focused) {
      iconScale.value = withSequence(
        withTiming(1.15, { duration: 140 }),
        withSpring(1, ICON_SPRING),
      );
    } else {
      iconScale.value = withSpring(1, ICON_SPRING);
    }
  }, [focused, pillProgress, iconScale, iconLift]);

  const pillBgStyle = useAnimatedStyle(() => ({
    opacity: pillProgress.value,
    transform: [{ scale: 0.5 + pillProgress.value * 0.5 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconLift.value }, { scale: iconScale.value }],
  }));

  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 5 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: activeBg, borderRadius: 12 },
          pillBgStyle,
        ]}
      />
      <Animated.View style={iconStyle}>
        <Icon size={20} color={color} />
      </Animated.View>
    </View>
  );
}

// Custom tab button — wraps the default RN Navigation button with a Pressable
// that scales down on press in (1 → 0.88) and springs back on release. This
// gives instantaneous visual feedback the moment the user taps, independent
// of how long the navigation/screen-mount takes for the focus-driven pill
// animation to start.
function AnimatedTabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  accessibilityRole,
  testID,
  style,
}: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => { /* haptics unavailable */ });
        }
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_SPRING);
      }}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
      android_ripple={null}
      style={[
        { flex: 1, alignItems: 'center', justifyContent: 'center' },
        style as object,
      ]}
    >
      <Animated.View
        style={[
          { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}


// Plain-Text tab label. Returns a raw <Text>, no wrapping <View>, with
// adjustsFontSizeToFit so the OS shrinks glyphs on narrow tab cells instead
// of inserting an ellipsis. Guarantees the full label is always readable.
function tabLabel(label: string) {
  return ({ color }: { focused: boolean; color: string }) => (
    <Text
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={{
        color,
        fontSize: 10,
        fontFamily: 'DMSans_400Regular',
        marginTop: 2,
        textAlign: 'center',
        includeFontPadding: false,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const C = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBg,
          borderTopColor: C.tabBorder,
          borderTopWidth: 0.5,
          height: 64 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        // Zero horizontal padding so the entire tab cell is available for the
        // label — RN Navigation's default item padding squeezes labels below
        // their natural width on small Android screens.
        tabBarItemStyle: { paddingHorizontal: 0, paddingVertical: 0 },
        tabBarAllowFontScaling: false,
        tabBarActiveTintColor: C.tabActive,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: tabLabel('Home'),
          tabBarAccessibilityLabel: 'Home tab - view your active moneyboxes',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Home} color={color} focused={focused} activeBg={C.tabActiveBg} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: tabLabel('History'),
          tabBarAccessibilityLabel: 'History tab - view completed moneyboxes',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Clock} color={color} focused={focused} activeBg={C.tabActiveBg} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarLabel: tabLabel('Games'),
          tabBarAccessibilityLabel: 'Games tab - play mini-games and earn badges',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Gamepad2} color={color} focused={focused} activeBg={C.tabActiveBg} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: tabLabel('Profile'),
          tabBarAccessibilityLabel: 'Profile tab - your badges, stats, and account',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={User} color={color} focused={focused} activeBg={C.tabActiveBg} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: tabLabel('Settings'),
          tabBarAccessibilityLabel: 'Settings tab - change preferences',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Settings} color={color} focused={focused} activeBg={C.tabActiveBg} />,
        }}
      />
    </Tabs>
  );
}
