import * as Haptics from 'expo-haptics';
import { Tabs, useRouter, usePathname } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import {
  Gamepad2,
  GraduationCap,
  Home,
  MoreHorizontal,
  PiggyBank,
  Settings as SettingsIcon,
  User as UserIcon,
  Wallet,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
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

// Same as AnimatedTabButton but calls our open handler instead of navigating.
// Used only for the "More" tab so we can show a sub-menu sheet rather than
// pushing to the placeholder /(tabs)/more route.
interface MoreTabButtonProps extends BottomTabBarButtonProps {
  onPress: () => void;
}

function MoreTabButton({
  children,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
  onPress: onMorePress,
}: MoreTabButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => { /* haptics unavailable */ });
        }
        onMorePress();
      }}
      onPressIn={() => { scale.value = withSpring(0.88, PRESS_SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, PRESS_SPRING); }}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
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
  const tabBarHeight = 64 + bottomPadding;

  // More sheet state — tapping the "More" tab opens a secondary pill that
  // slides up from behind the main tab bar with links to Profile / Settings
  // / Games. Kept mounted briefly after close so the slide-down animation
  // can play.
  const [moreSheetMounted, setMoreSheetMounted] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const openMoreSheet = () => {
    setMoreSheetMounted(true);
    requestAnimationFrame(() => setMoreSheetOpen(true));
  };

  const closeMoreSheet = () => {
    setMoreSheetOpen(false);
    setTimeout(() => setMoreSheetMounted(false), 280);
  };

  return (
    <View style={{ flex: 1 }}>
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
            tabBarAccessibilityLabel: 'Home tab',
            tabBarIcon: ({ color, focused }) => <TabIcon icon={Home} color={color} focused={focused} activeBg={C.tabActiveBg} />,
          }}
        />
        <Tabs.Screen
          name="stash"
          options={{
            title: 'Stash',
            tabBarLabel: tabLabel('Stash'),
            tabBarAccessibilityLabel: 'Stash tab - view your active stashboxes and wins',
            tabBarIcon: ({ color, focused }) => <TabIcon icon={PiggyBank} color={color} focused={focused} activeBg={C.tabActiveBg} />,
          }}
        />
        <Tabs.Screen
          name="loans"
          options={{
            title: 'Loans',
            tabBarLabel: tabLabel('Loans'),
            tabBarAccessibilityLabel: 'Loans tab - track and pay off student loans',
            tabBarIcon: ({ color, focused }) => <TabIcon icon={GraduationCap} color={color} focused={focused} activeBg={C.tabActiveBg} />,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Expenses',
            tabBarLabel: tabLabel('Expenses'),
            tabBarAccessibilityLabel: 'Expenses tab - track income and expenses',
            tabBarIcon: ({ color, focused }) => <TabIcon icon={Wallet} color={color} focused={focused} activeBg={C.tabActiveBg} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarLabel: tabLabel('More'),
            tabBarAccessibilityLabel: 'More - profile, settings, and games',
            tabBarIcon: ({ color, focused }) => <TabIcon icon={MoreHorizontal} color={color} focused={focused} activeBg={C.tabActiveBg} />,
            tabBarButton: (props) => (
              <MoreTabButton {...props} onPress={openMoreSheet} />
            ),
          }}
        />
        {/* Hidden routes — accessible from the More sheet or other screens */}
        <Tabs.Screen name="history" options={{ href: null }} />
        <Tabs.Screen name="games" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      {moreSheetMounted && (
        <MoreSheet
          open={moreSheetOpen}
          tabBarHeight={tabBarHeight}
          onClose={closeMoreSheet}
        />
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * More sheet — secondary pill with text labels that slides up from
 * behind the main tab bar when "More" is tapped. Clipping wrapper
 * (overflow: 'hidden') makes the slide-in look like the pill is
 * emerging from underneath the tab bar.
 * ──────────────────────────────────────────────────────────────────── */

interface MoreSheetProps {
  open: boolean;
  tabBarHeight: number;
  onClose: () => void;
}

// Edge-to-edge horizontal menu panel that slides up from behind the main
// tab bar. Single row, 3 equal cells side by side, each cell rendering an
// icon next to a label.
const MORE_BAR_HEIGHT = 72;

function MoreSheet({ open, tabBarHeight, onClose }: MoreSheetProps) {
  const C = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();

  const translateY = useSharedValue(MORE_BAR_HEIGHT);

  useEffect(() => {
    if (open) {
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = withTiming(MORE_BAR_HEIGHT, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [open, translateY]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const go = (path: '/(tabs)/profile' | '/(tabs)/settings' | '/(tabs)/games') => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 60);
  };

  return (
    <View style={[StyleSheet.absoluteFill]} pointerEvents="box-none">
      {/* Transparent tap-catcher above the tab bar — closes the menu on tap. */}
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close More menu"
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
      />

      {/* Clipping wrapper sits flush above the main tab bar. overflow: 'hidden'
       *  clips the bar while it's translated downward, so the slide-up looks
       *  like the menu is emerging from behind the tab bar. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: tabBarHeight,
          left: 0,
          right: 0,
          height: MORE_BAR_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: MORE_BAR_HEIGHT,
              // Light grey background — matches the original tab bar's
              // restrained palette but distinct enough to read as a
              // separate stacked surface.
              backgroundColor: C.borderLight,
              borderTopColor: C.tabBorder,
              borderTopWidth: 0.5,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 8,
            },
            barStyle,
          ]}
        >
          <MoreMenuCell
            icon={Gamepad2}
            label="Games"
            active={pathname === '/games'}
            onPress={() => go('/(tabs)/games')}
          />
          <MoreMenuCell
            icon={UserIcon}
            label="Profile"
            active={pathname === '/profile'}
            onPress={() => go('/(tabs)/profile')}
          />
          <MoreMenuCell
            icon={SettingsIcon}
            label="Settings"
            active={pathname === '/settings'}
            onPress={() => go('/(tabs)/settings')}
          />
        </Animated.View>
      </View>
    </View>
  );
}

interface MoreMenuCellProps {
  icon: typeof Home;
  label: string;
  active: boolean;
  onPress: () => void;
}

function MoreMenuCell({ icon: Icon, label, active, onPress }: MoreMenuCellProps) {
  const C = useAppTheme();
  const tint = active ? C.tabActive : C.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={({ pressed }) => ({
        // Intrinsic-width pill so the container's space-between layout
        // actually pushes cells to the edges instead of stretching them
        // edge to edge.
        paddingHorizontal: 16,
        paddingVertical: 10,
        // Squircle-feeling pill radius — generous enough to read as a
        // capsule with the height we have.
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        // Active route gets the green active-pill bg (same token as the
        // main tab bar's focused pill). Pressed deepens it briefly.
        backgroundColor: active
          ? C.tabActiveBg
          : pressed
            ? C.tabActiveBg
            : C.surface,
      })}
    >
      {/* Inner row — locks icon + label onto a single horizontal axis so
       *  RN never wraps them onto two lines on narrow phones. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'nowrap',
        }}
      >
        <Icon size={16} color={tint} strokeWidth={2.2} />
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            marginLeft: 6,
            fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold',
            fontSize: 13,
            color: tint,
            letterSpacing: -0.1,
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
