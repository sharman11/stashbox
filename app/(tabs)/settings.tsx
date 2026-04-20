import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as StoreReview from 'expo-store-review';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  LogOut,
  Pencil,
  Share2,
  Star,
  Upload,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AvatarPicker } from '@/components/AvatarPicker';
import { CustomAlert } from '@/components/CustomAlert';
import { SpringPressable } from '@/components/SpringPressable';

import { Trash2 } from 'lucide-react-native';

import { deleteAccount } from '@/lib/auth';
import { exportBackup, importBackup } from '@/lib/backup';
import { requestAndRegisterNotifications, unregisterNotifications } from '@/lib/push';
import { CURRENCY_LIST } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAlert } from '@/lib/use-alert';

const C = {
  heroTop: '#0B3D2E',
  heroMid: '#145A42',
  heroBot: '#1E7A5C',
  accent: '#1DB954',
  accentDark: '#166534',
  accentLight: '#E6F4EA',
  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

const POPULAR_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, isAnonymous, email, signOut } = useSessionStore();
  const { profile, update } = useProfileStore();
  const { moneyboxes } = useMoneyboxesStore();
  const { emoji: avatarEmoji, setAvatar } = useAvatarStore();
  const completedBoxes = moneyboxes.filter((b) => b.status === 'completed').length;
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState(profile?.displayName ?? '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  if (!profile) return null;

  const saveName = () => {
    update({ displayName: nameText.trim() || null });
    setEditingName(false);
  };

  const visibleCurrencies = showAllCurrencies
    ? CURRENCY_LIST
    : CURRENCY_LIST.filter((c) => POPULAR_CURRENCIES.includes(c.code) || c.code === profile.defaultCurrency);

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Green gradient header with avatar ── */}
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ paddingBottom: 60, alignItems: 'center' }}
          >
            <View style={{ paddingTop: 56, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Settings
              </Text>

              {/* Avatar — tappable */}
              <SpringPressable
                onPress={() => setShowAvatarPicker((v) => !v)}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                }}
              >
                <Text style={{ fontSize: 36 }}>{avatarEmoji}</Text>
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: C.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: C.heroBot,
                  }}
                >
                  <Pencil size={10} color="#FFFFFF" />
                </View>
              </SpringPressable>

              {/* Name */}
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 22,
                  color: '#FFFFFF',
                  marginTop: 12,
                }}
              >
                {profile.displayName || 'Your name'}
              </Text>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
            {/* ── Avatar picker (expandable) ── */}
            {showAvatarPicker && (
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: 'rgba(0,0,0,0.12)',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: C.textPrimary,
                    marginBottom: 12,
                  }}
                >
                  Choose avatar
                </Text>
                <AvatarPicker
                  selected={avatarEmoji}
                  completedBoxes={completedBoxes}
                  onSelect={(emoji) => {
                    setAvatar(emoji);
                    setShowAvatarPicker(false);
                  }}
                />
              </View>
            )}

            {/* ── Profile card (overlapping) ── */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              {/* Display name row */}
              {editingName ? (
                <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginBottom: 6,
                    }}
                  >
                    Display name
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      value={nameText}
                      onChangeText={setNameText}
                      placeholder="Your name"
                      placeholderTextColor={C.textFaint}
                      autoFocus
                      style={{
                        flex: 1,
                        backgroundColor: C.borderLight,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 16,
                        fontFamily: 'Inter_500Medium',
                        color: C.textPrimary,
                      }}
                      returnKeyType="done"
                      onSubmitEditing={saveName}
                    />
                    <Pressable
                      onPress={saveName}
                      style={{
                        backgroundColor: C.accent,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' }}>
                        Save
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <SpringPressable
                  onPress={() => { setNameText(profile.displayName ?? ''); setEditingName(true); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>
                      Display name
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 16,
                        color: profile.displayName ? C.textPrimary : C.textFaint,
                        marginTop: 2,
                      }}
                    >
                      {profile.displayName || 'Tap to set'}
                    </Text>
                  </View>
                  <Pencil size={16} color={C.textFaint} />
                </SpringPressable>
              )}

              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />

              {/* Default currency row */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                  Default currency
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {visibleCurrencies.map((c) => {
                    const selected = profile.defaultCurrency === c.code;
                    return (
                      <Pressable
                        key={c.code}
                        disabled={updatingCurrency}
                        onPress={async () => {
                          if (updatingCurrency) return;
                          setUpdatingCurrency(true);
                          await update({ defaultCurrency: c.code as CurrencyCode });
                          setUpdatingCurrency(false);
                        }}
                        style={{
                          backgroundColor: selected ? C.accent : C.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{c.flag}</Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 13,
                            color: selected ? '#FFFFFF' : C.textPrimary,
                          }}
                        >
                          {c.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!showAllCurrencies && (
                  <SpringPressable
                    onPress={() => setShowAllCurrencies(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}
                  >
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.accent }}>
                      Show all currencies
                    </Text>
                    <ChevronDown size={14} color={C.accent} />
                  </SpringPressable>
                )}
                {showAllCurrencies && (
                  <SpringPressable
                    onPress={() => setShowAllCurrencies(false)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}
                  >
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.accent }}>
                      Show less
                    </Text>
                    <ChevronUp size={14} color={C.accent} />
                  </SpringPressable>
                )}
              </View>
            </View>

            {/* ── Preferences ── */}
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              PREFERENCES
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Sound effects
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Coin drop sounds when saving
                  </Text>
                </View>
                <Switch
                  value={profile.soundEnabled}
                  onValueChange={(v) => update({ soundEnabled: v })}
                  trackColor={{ false: '#E5E7EB', true: C.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Haptic feedback
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Vibrate on interactions
                  </Text>
                </View>
                <Switch
                  value={profile.hapticsEnabled}
                  onValueChange={(v) => update({ hapticsEnabled: v })}
                  trackColor={{ false: '#E5E7EB', true: C.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Daily reminders
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Get nudged if you forget to save
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={async (v) => {
                    if (!userId) return;
                    if (v) {
                      const granted = await requestAndRegisterNotifications(userId);
                      setNotificationsEnabled(granted);
                    } else {
                      await unregisterNotifications(userId);
                      setNotificationsEnabled(false);
                    }
                  }}
                  trackColor={{ false: '#E5E7EB', true: C.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* ── Data ── */}
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              DATA
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <SpringPressable
                disabled={exporting}
                onPress={async () => {
                  if (!userId) return;
                  setExporting(true);
                  try {
                    await exportBackup(userId);
                  } catch (e: unknown) {
                    showAlert('Export failed', e instanceof Error ? e.message : 'Something went wrong.', undefined, '⚠️');
                  } finally {
                    setExporting(false);
                  }
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: C.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Download size={16} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    {exporting ? 'Exporting...' : 'Export backup'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Save all data to a JSON file
                  </Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>

              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />

              <SpringPressable
                disabled={importing}
                onPress={() => {
                  if (!userId) return;
                  showAlert(
                    'Import backup',
                    "Imported moneyboxes will be added as new entries. Existing ones won't be changed.",
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Import',
                        onPress: async () => {
                          setImporting(true);
                          try {
                            const { imported } = await importBackup(userId);
                            if (imported > 0)
                              showAlert('Import complete', `Restored ${imported} moneybox${imported > 1 ? 'es' : ''}.`, undefined, '✅');
                          } catch (e: unknown) {
                            showAlert('Import failed', e instanceof Error ? e.message : 'Something went wrong.', undefined, '⚠️');
                          } finally {
                            setImporting(false);
                          }
                        },
                      },
                    ],
                    '📦',
                  );
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  opacity: importing ? 0.6 : 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: C.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={16} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    {importing ? 'Importing...' : 'Import backup'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Restore from a previous export
                  </Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>
            </View>

            {/* ── Support ── */}
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              SUPPORT
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <SpringPressable
                onPress={() => StoreReview.requestReview()}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={16} color="#F59E0B" />
                </View>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary, flex: 1 }}>
                  Rate Stashbox
                </Text>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>

              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />

              <SpringPressable
                onPress={() => {
                  import('react-native').then(({ Share }) =>
                    Share.share({
                      message: 'Check out Stashbox — a fun way to save money daily! https://stashbox.app',
                    })
                  );
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={16} color="#7C3AED" />
                </View>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary, flex: 1 }}>
                  Share with friends
                </Text>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>
            </View>

            {/* ── More from Optruvian ── */}
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              MORE FROM OPTRUVIAN
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <SpringPressable
                onPress={() => Linking.openURL('https://www.hotlist-jobs.com')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Hotlist Jobs
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                    Fresh tech jobs, verified daily
                  </Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>

              <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />

              <SpringPressable
                onPress={() => Linking.openURL('https://www.optruvian.com')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    Optruvian
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                    Simple tools that just work
                  </Text>
                </View>
                <ChevronRight size={16} color={C.textFaint} />
              </SpringPressable>
            </View>

            {/* ── Account ── */}
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              ACCOUNT
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>
                      Signed in as
                    </Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary, marginTop: 2 }}>
                      {email ?? 'No email on file'}
                    </Text>
                  </View>
                  <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
                  <SpringPressable
                    onPress={() =>
                      showAlert('Log out?', 'Your data is saved and will be here when you come back.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Log out', style: 'destructive', onPress: () => signOut() },
                      ], '👋')
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                      <LogOut size={16} color="#EF4444" />
                    </View>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: '#EF4444', flex: 1 }}>
                      Log out
                    </Text>
                  </SpringPressable>

                  <View style={{ height: 0.5, backgroundColor: C.borderLight, marginHorizontal: 16 }} />

                  <SpringPressable
                    onPress={() =>
                      showAlert(
                        'Delete account?',
                        'This will permanently delete your account, all moneyboxes, and all saved data. This cannot be undone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete forever',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteAccount();
                              } catch (e: unknown) {
                                showAlert('Failed', e instanceof Error ? e.message : 'Could not delete account.', undefined, '⚠️');
                              }
                            },
                          },
                        ],
                        '🗑️',
                      )
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={16} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: '#EF4444' }}>
                        Delete account
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                        Permanently remove all data
                      </Text>
                    </View>
                  </SpringPressable>
                </>
            </View>

            {/* Legal */}
            <SpringPressable
              onPress={() => Linking.openURL('https://www.optruvian.com/privacy')}
              style={{ alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>
                Privacy Policy
              </Text>
            </SpringPressable>

            {/* Version */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.textFaint }}>
                Stashbox v{Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}
