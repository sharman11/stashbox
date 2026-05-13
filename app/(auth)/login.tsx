import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Lock, Mail, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resetPassword, signInWithEmail } from '@/lib/auth';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

export default function LoginScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refresh = useSessionStore((s) => s.refresh);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid = isValidEmail && password.length >= 1;

  const handleLogin = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    useSessionStore.getState().setTransitioning(true);
    try {
      await signInWithEmail(email.trim(), password);
      await refresh();
      const snap = useSessionStore.getState();
      if (snap.userId) {
        const { useProfileStore } = await import('@/lib/stores/profile');
        await useProfileStore.getState().load(snap.userId);
      }
      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
      useSessionStore.getState().setTransitioning(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isValidEmail) {
      setError('Enter a valid email address first.');
      return;
    }
    setError(null);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {/* ── Hero ── */}
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingTop: insets.top + 28,
              paddingBottom: 28,
              paddingHorizontal: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
              }}
            >
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={{ fontSize: 32, textAlign: 'center', includeFontPadding: false }}
              >
                👋
              </Text>
            </View>
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 24,
                color: '#FFFFFF',
                marginTop: 16,
                textAlign: 'center',
                includeFontPadding: false,
              }}
            >
              Welcome back
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                maxWidth: '100%',
              }}
            >
              <Wallet size={14} color="rgba(255,255,255,0.75)" />
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                  includeFontPadding: false,
                }}
              >
                Your savings streak is waiting
              </Text>
            </View>
          </LinearGradient>

          {/* ── Form ── */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            {error && (
              <View
                style={{
                  backgroundColor: C.errorBg,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: C.errorBg,
                }}
              >
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={4}
                  ellipsizeMode="tail"
                  selectable
                  style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18, color: C.errorText, includeFontPadding: false }}
                >
                  {error}
                </Text>
              </View>
            )}

            {resetSent && (
              <View
                style={{
                  backgroundColor: C.accentLight,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: C.accentLight,
                }}
              >
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={3}
                  ellipsizeMode="middle"
                  selectable
                  style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18, color: C.accent, includeFontPadding: false }}
                >
                  Password reset email sent to {email}
                </Text>
              </View>
            )}

            <View style={{ gap: 10 }}>
              <InputField
                icon={<Mail size={18} color={C.textMuted} />}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <InputField
                icon={<Lock size={18} color={C.textMuted} />}
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                trailing={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={C.textMuted} />
                    ) : (
                      <Eye size={18} color={C.textMuted} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* Spacer above forgot password */}
            <View style={{ height: 16 }} />

            <View style={{ alignItems: 'flex-end' }}>
              <Pressable onPress={handleForgotPassword} hitSlop={8}>
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: C.accent,
                    includeFontPadding: false,
                  }}
                >
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* Spacer between forgot password and button */}
            <View style={{ height: 32 }} />

            <Pressable
              onPress={handleLogin}
              disabled={!isValid || loading}
              style={({ pressed }) => ({
                borderRadius: 16,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: C.buttonPrimaryBg,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isValid ? 0.35 : 0,
                shadowRadius: 20,
                elevation: isValid ? 8 : 0,
              })}
            >
              <View
                style={{
                  backgroundColor: isValid ? C.buttonPrimaryBg : C.borderLight,
                  borderRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={C.buttonPrimaryText} />
                ) : (
                  <Text
                    allowFontScaling={false}
                    maxFontSizeMultiplier={1}
                    numberOfLines={1}
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 16,
                      color: isValid ? C.buttonPrimaryText : C.textMuted,
                      includeFontPadding: false,
                    }}
                  >
                    Log in
                  </Text>
                )}
              </View>
            </Pressable>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Pressable onPress={() => router.replace('/(auth)/signup')} hitSlop={8}>
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: C.textSecondary,
                    textAlign: 'center',
                    includeFontPadding: false,
                  }}
                >
                  New here?{' '}
                  <Text style={{ fontFamily: 'DMSans_400Regular', color: C.accent }}>
                    Create an account
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Reusable input field ─────────────────────────────────────────── */

interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'password-new';
  secureTextEntry?: boolean;
  trailing?: React.ReactNode;
  errored?: boolean;
}

function InputField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoComplete,
  secureTextEntry,
  trailing,
  errored,
}: InputFieldProps) {
  const C = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: errored ? '#EF4444' : focused ? C.accent : C.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: C.textMuted,
            marginBottom: 2,
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={C.textFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          secureTextEntry={secureTextEntry}
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          style={{
            fontSize: 15,
            fontFamily: 'DMSans_400Regular',
            color: C.textPrimary,
            padding: 0,
            includeFontPadding: false,
          }}
        />
      </View>
      {trailing}
    </View>
  );
}
