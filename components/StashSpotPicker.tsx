import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/lib/stores/theme';
import { STASH_SPOTS, getStashSpot } from '@/lib/stash-spots';

interface StashSpotPickerProps {
  visible: boolean;
  current: string | null;
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function StashSpotPicker({ visible, current, onSelect, onCancel }: StashSpotPickerProps) {
  const C = useAppTheme();
  // Local pick lets the user explore tips before committing.
  const [pending, setPending] = useState<string | null>(current);

  // Reset to whatever the parent currently has whenever the picker re-opens.
  // Also dismiss the keyboard so a sheet sliding up from the bottom doesn't
  // collide with a keyboard that was up from a parent TextInput
  // (e.g. moneybox name field in EditMoneyboxModal).
  useEffect(() => {
    if (visible) {
      setPending(current);
      Keyboard.dismiss();
    }
  }, [visible, current]);

  const pendingSpot = getStashSpot(pending);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: C.overlay,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.pageBg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: '85%',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingBottom: 6 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: C.border,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 18,
                color: C.textPrimary,
              }}
            >
              Where will the cash live?
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: C.textSecondary,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              Stashbox tracks. You stash. Pick a real spot you&apos;ll go back to every time.
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STASH_SPOTS.map((spot) => {
                const selected = spot.id === pending;
                return (
                  <Pressable
                    key={spot.id}
                    onPress={() => setPending(spot.id)}
                    style={{
                      width: '31.5%',
                      backgroundColor: C.surface,
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 6,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? C.accent : C.border,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{spot.emoji}</Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: C.textPrimary,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {spot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tip preview for the pending pick */}
            {pendingSpot && (
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: C.accentLight,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 16 }}>💡</Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: C.accentDark,
                    lineHeight: 19,
                  }}
                >
                  {pendingSpot.tip}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable
              onPress={() => {
                if (pending) onSelect(pending);
              }}
              disabled={!pending}
              style={{
                backgroundColor: pending ? C.buttonPrimaryBg : C.borderLight,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Check size={16} color={pending ? C.buttonPrimaryText : C.textMuted} />
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 15,
                  color: pending ? C.buttonPrimaryText : C.textMuted,
                }}
              >
                {pending ? `Use ${pendingSpot?.label}` : 'Pick a spot'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
