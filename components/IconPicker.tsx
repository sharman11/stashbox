import { Modal, Pressable, ScrollView, Text } from 'react-native';

import { useAppTheme } from '@/lib/stores/theme';

/** Curated emoji set covering common saving-goal categories. Limited to glyphs
 *  with broad iOS + Android coverage so pickers don't render tofu. */
export const ICON_PALETTE: readonly string[] = [
  // Money-y default
  '💰', '💵', '💎', '🏦',
  // Travel + experiences
  '✈️', '🏖️', '🌍', '🗺️', '🎒', '🚗', '🚲', '🛵',
  // Tech
  '📱', '💻', '🎮', '📷', '🎧', '⌚',
  // Home + family
  '🏠', '🛋️', '🛏️', '🍽️', '🌱',
  // Life events
  '💍', '🎓', '👶', '🐶', '🐱',
  // Health + wellbeing
  '🏥', '💊', '🏋️', '🧘',
  // Treats + hobbies
  '🎁', '🎂', '☕', '🍕', '🍷', '🎬', '🎵', '📚', '🎨',
  // Sports + outdoors
  '⚽', '🏀', '🎿', '🏆',
  // Generic / abstract
  '🎯', '⭐', '🔥', '❤️',
];

interface IconPickerProps {
  visible: boolean;
  current: string;
  onSelect: (icon: string) => void;
  onCancel: () => void;
}

export function IconPicker({ visible, current, onSelect, onCancel }: IconPickerProps) {
  const C = useAppTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: C.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            paddingTop: 20,
            paddingBottom: 20,
            paddingHorizontal: 16,
            width: '100%',
            maxWidth: 360,
            maxHeight: '70%',
            shadowColor: 'rgba(0,0,0,0.12)',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 1,
            shadowRadius: 32,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 16,
              color: C.textPrimary,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Pick an icon
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Shown next to your moneybox name everywhere.
          </Text>

          <ScrollView
            contentContainerStyle={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            {ICON_PALETTE.map((emoji) => {
              const selected = emoji === current;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onSelect(emoji)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: selected ? C.accentLight : C.pageBg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? C.accent : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
