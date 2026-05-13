import { Check, Lock, Play, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomAlert } from '@/components/CustomAlert';
import { AvatarVisual } from '@/components/AvatarVisual';
import { AD_UNIT_IDS } from '@/lib/ads';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  CATEGORY_LABEL,
  describeRequirement,
  groupAvatarsByCategory,
  isAvatarUnlocked,
} from '@/lib/avatars';
import type { AvatarCategory, AvatarConfig, AvatarStats } from '@/lib/avatars';
import { useAppTheme } from '@/lib/stores/theme';
import { useAlert } from '@/lib/use-alert';

const COLUMNS = 5;
const GAP = 10;

interface AvatarPickerProps {
  visible: boolean;
  selected: string;
  stats: AvatarStats;
  /** Commit a new pick. Picker stays open so the user can keep browsing. */
  onSelect: (id: string) => void;
  /** Mark an ad-watch avatar as unlocked - called after a rewarded ad is earned. */
  onAdUnlock: (id: string) => void;
  /** User dismissed the picker via X / hardware back. */
  onClose: () => void;
}

/** Show a rewarded ad and resolve true if the EARNED_REWARD event fires. */
function playRewardedAd(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
    let earned = false;
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try { ad.show(); } catch { resolve(false); }
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      resolve(earned);
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      resolve(false);
    });
    ad.load();
  });
}

export function AvatarPicker({
  visible,
  selected,
  stats,
  onSelect,
  onAdUnlock,
  onClose,
}: AvatarPickerProps) {
  const C = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const groups = useMemo(groupAvatarsByCategory, []);
  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  const sectionY = useRef<Partial<Record<AvatarCategory, number>>>({});
  const scrollRef = useRef<ScrollView>(null);
  const [adInFlight, setAdInFlight] = useState<string | null>(null);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const jumpTo = (cat: AvatarCategory) => {
    const y = sectionY.current[cat];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  const itemSize = Math.floor((width - 32 - GAP * (COLUMNS - 1)) / COLUMNS);

  /** Locked-tile tap router. Ad-watch avatars get a "watch ad?" prompt;
   *  any other locked avatar is a no-op (shows requirement label only). */
  const handleLockedTap = (avatar: AvatarConfig) => {
    if (avatar.requirement?.type !== 'ad-watch') return;
    if (adInFlight) return; // user already watching - ignore taps

    showAlert(
      'Unlock this avatar?',
      'Watch a short ad to unlock this avatar permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Watch ad',
          onPress: async () => {
            setAdInFlight(avatar.id);
            const earned = await playRewardedAd();
            setAdInFlight(null);
            if (earned) {
              onAdUnlock(avatar.id);
              onSelect(avatar.id);
            } else {
              showAlert(
                'Ad unavailable',
                'Try again in a moment.',
                undefined,
                '⚠️',
              );
            }
          },
        },
      ],
      '🎬',
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: C.pageBg, paddingTop: insets.top }}>
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.borderLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={C.textPrimary} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 18,
                color: C.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              Choose avatar
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textMuted,
                marginTop: 1,
              }}
            >
              {totalCount} to pick from
            </Text>
          </View>
        </View>

        {/* ── Hero preview of the currently selected avatar ── */}
        <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}>
          <View
            style={{
              padding: 4,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: C.accent,
            }}
          >
            <AvatarVisual avatar={selected} size={96} />
          </View>
        </View>

        {/* ── Quick-jump chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}
          style={{
            flexGrow: 0,
            borderTopWidth: 0.5,
            borderTopColor: C.borderLight,
            borderBottomWidth: 0.5,
            borderBottomColor: C.borderLight,
          }}
        >
          {groups.map(({ category, items }) => (
            <Pressable
              key={category}
              onPress={() => jumpTo(category)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: C.textPrimary,
                }}
              >
                {CATEGORY_LABEL[category]}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                {items.length}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Full vertical list ── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {groups.map(({ category, items }) => (
            <View
              key={category}
              onLayout={(e) => {
                sectionY.current[category] = e.nativeEvent.layout.y;
              }}
              style={{ marginBottom: 24 }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 12,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                {CATEGORY_LABEL[category].toUpperCase()} · {items.length}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {items.map((a) => (
                  <AvatarItem
                    key={a.id}
                    avatar={a}
                    size={itemSize}
                    selected={selected === a.id}
                    unlocked={isAvatarUnlocked(a, stats)}
                    loading={adInFlight === a.id}
                    onSelect={onSelect}
                    onLockedTap={handleLockedTap}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
      </View>
    </Modal>
  );
}

interface AvatarItemProps {
  avatar: AvatarConfig;
  size: number;
  selected: boolean;
  unlocked: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
  onLockedTap: (avatar: AvatarConfig) => void;
}

function AvatarItem({
  avatar,
  size,
  selected,
  unlocked,
  loading,
  onSelect,
  onLockedTap,
}: AvatarItemProps) {
  const C = useAppTheme();
  const reqLabel = avatar.requirement ? describeRequirement(avatar.requirement) : null;
  const isAdWatch = avatar.requirement?.type === 'ad-watch';

  return (
    <View style={{ width: size, alignItems: 'center', gap: 4 }}>
      <Pressable
        onPress={() => (unlocked ? onSelect(avatar.id) : onLockedTap(avatar))}
        disabled={loading}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 2.5 : 0,
          borderColor: C.accent,
          opacity: !unlocked && !isAdWatch ? 0.35 : pressed ? 0.7 : 1,
        })}
      >
        <AvatarVisual avatar={avatar} size={size} />

        {selected && unlocked && (
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: C.surface,
            }}
          >
            <Check size={9} color="#FFFFFF" />
          </View>
        )}

        {!unlocked && (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: 'rgba(0,0,0,0.18)',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {isAdWatch ? (
              <Play size={10} color={C.accent} fill={C.accent} />
            ) : (
              <Lock size={10} color={C.textMuted} />
            )}
          </View>
        )}
      </Pressable>

      {reqLabel && (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          allowFontScaling={false}
          style={{
            alignSelf: 'stretch',
            fontFamily: 'DMSans_500Medium',
            fontSize: 9,
            color: unlocked ? C.accent : C.textMuted,
            textAlign: 'center',
          }}
        >
          {loading ? 'Loading…' : unlocked ? 'Unlocked' : reqLabel}
        </Text>
      )}
    </View>
  );
}
