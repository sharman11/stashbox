import { Check, Lock, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { IconPicker } from '@/components/IconPicker';
import { StashSpotPicker } from '@/components/StashSpotPicker';
import { getStashSpot } from '@/lib/stash-spots';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { GradientButton } from './GradientButton';
import { useAppTheme } from '@/lib/stores/theme';
import { THEMES } from '@/lib/theme';
import { getThemeLockState } from '@/lib/theme-unlocks';
import type { Moneybox, ThemeId } from '@/lib/types';

const NAME_MAX = 40;

const THEME_OPTIONS = Object.values(THEMES);

interface EditMoneyboxModalProps {
  visible: boolean;
  moneybox: Moneybox | null;
  onCancel: () => void;
  onSave: (patch: {
    name: string;
    icon: string;
    stashSpot: string | null;
    theme: ThemeId;
  }) => Promise<void>;
}

export function EditMoneyboxModal({ visible, moneybox, onCancel, onSave }: EditMoneyboxModalProps) {
  const C = useAppTheme();
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  // Drives theme-lock gating in the picker (silver = 1+, gold = 2+).
  const completedBoxes = useMemo(
    () => moneyboxes.filter((b) => b.status === 'completed').length,
    [moneyboxes],
  );
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('💰');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [stashSpot, setStashSpot] = useState<string | null>(null);
  const [stashPickerOpen, setStashPickerOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>('classic_gold');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && moneybox) {
      setName(moneybox.name);
      setIcon(moneybox.icon || '💰');
      setStashSpot(moneybox.stashSpot);
      setTheme(moneybox.theme);
      setError(null);
      setSaving(false);
    }
  }, [visible, moneybox]);

  const trimmed = name.trim();
  const nameValid = trimmed.length > 0 && trimmed.length <= NAME_MAX;
  const changed =
    moneybox !== null &&
    (trimmed !== moneybox.name ||
      theme !== moneybox.theme ||
      icon !== (moneybox.icon || '💰') ||
      stashSpot !== moneybox.stashSpot);
  const canSave = nameValid && changed && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmed, icon, stashSpot, theme });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  };

  const stashSpotInfo = getStashSpot(stashSpot);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: C.pageBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 36,
            maxHeight: '88%',
          }}
        >
          {/* Handle + header */}
          <View style={{ alignItems: 'center', paddingBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            <Pressable onPress={onCancel} hitSlop={10}>
              <X size={22} color={C.textPrimary} />
            </Pressable>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary }}>
              Edit moneybox
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Icon + Name */}
            <View>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                ICON & NAME
              </Text>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: !nameValid && name.length > 0 ? '#FCA5A5' : C.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Pressable
                  onPress={() => setIconPickerOpen(true)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: C.borderLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                </Pressable>
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                  placeholder="Stashbox name"
                  placeholderTextColor={C.textFaint}
                  maxLength={NAME_MAX}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'DMSans_500Medium',
                    color: C.textPrimary,
                    padding: 0,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted }}>
                  {trimmed.length === 0 ? 'Name cannot be empty' : 'Editing name never affects progress'}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted }}>
                  {name.length}/{NAME_MAX}
                </Text>
              </View>
            </View>

            {/* Stash spot */}
            <View>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                STASH SPOT
              </Text>
              <Pressable
                onPress={() => setStashPickerOpen(true)}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: C.borderLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{stashSpotInfo?.emoji ?? '✨'}</Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 15,
                    color: C.textPrimary,
                  }}
                >
                  {stashSpotInfo?.label ?? 'Pick a spot'}
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.accent }}>
                  Change
                </Text>
              </Pressable>
            </View>

            {/* Theme */}
            <View>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                THEME
              </Text>
              <View style={{ gap: 8 }}>
                {THEME_OPTIONS.map((t) => {
                  const selected = theme === t.id;
                  const lock = getThemeLockState(t.id, completedBoxes);
                  // The user's existing theme on this box always stays
                  // selectable, even if the lock rule would otherwise block
                  // it - we don't strip a theme they already have.
                  const usable = lock.unlocked || selected;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        if (usable) setTheme(t.id);
                      }}
                      disabled={!usable}
                      style={{
                        backgroundColor: C.surface,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? C.accent : C.border,
                        opacity: usable ? 1 : 0.55,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        {selected ? (
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: C.accent,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={12} color="#FFFFFF" />
                          </View>
                        ) : !usable ? (
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: C.borderLight,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Lock size={11} color={C.textMuted} />
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_600SemiBold',
                              fontSize: 15,
                              color: C.textPrimary,
                            }}
                          >
                            {t.label}
                          </Text>
                          {!usable && lock.requirementLabel && (
                            <Text
                              style={{
                                fontFamily: 'DMSans_500Medium',
                                fontSize: 11,
                                color: C.textMuted,
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {lock.requirementLabel}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[t.heroGradientStart, t.accent, t.cellFilled].map((color, i) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: color,
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                            }}
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {error && (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: C.errorText,
                  textAlign: 'center',
                }}
              >
                {error}
              </Text>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <GradientButton
              label={saving ? 'Saving…' : 'Save changes'}
              onPress={handleSave}
              enabled={canSave}
              disabled={!canSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      <IconPicker
        visible={iconPickerOpen}
        current={icon}
        onSelect={(emoji) => {
          setIcon(emoji);
          setIconPickerOpen(false);
        }}
        onCancel={() => setIconPickerOpen(false)}
      />
      <StashSpotPicker
        visible={stashPickerOpen}
        current={stashSpot}
        onSelect={(id) => {
          setStashSpot(id);
          setStashPickerOpen(false);
        }}
        onCancel={() => setStashPickerOpen(false)}
      />
    </Modal>
  );
}
