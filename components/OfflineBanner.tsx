import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Global connectivity banner. Slides in when the device goes offline so failed
 * saves/loads read as "you're offline" instead of looking like app bugs.
 * Mounted once at the root, above all screens.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Treat unknown (null) as online to avoid false alarms on cold start.
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 6,
        left: 16,
        right: 16,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1F2937',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      }}
    >
      <WifiOff size={14} color="#FFFFFF" />
      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#FFFFFF' }}>
        You're offline — changes will sync when you reconnect
      </Text>
    </Animated.View>
  );
}
