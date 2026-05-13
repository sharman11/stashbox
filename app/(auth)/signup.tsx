import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react-native';
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

import { signUpWithEmail } from '@/lib/auth';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

export default function SignupScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refresh = useSessionStore((s) => s.refresh);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid = isValidEmail && password.length >= 8 && password === confirmPassword;

  const handleSignup = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    useSessionStore.getState().setTransitioning(true);
    try {
      await signUpWithEmail(email.trim(), password);
      await refresh();
      router.replace('/onboarding');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
      useSessionStore.getState().setTransitioning(false);
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
              <Text style={{ fontSize: 32, textAlign: 'center' }}>💰</Text>
            </View>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 28,
                color: '#FFFFFF',
                marginTop: 16,
                letterSpacing: -0.5,
                textAlign: 'center',
              }}
            >
              Join Stashbox
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
              <Sparkles size={14} color="rgba(255,255,255,0.75)" />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                Save smarter, one day at a time
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
                  numberOfLines={4}
                  ellipsizeMode="tail"
                  selectable
                  style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18, color: C.errorText }}
                >
                  {error}
                </Text>
              </View>
            )}

            {/* Fields */}
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
                placeholder="Min 8 characters"
                secureTextEntry={!showPassword}
                autoComplete="password-new"
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

              <InputField
                icon={<Lock size={18} color={C.textMuted} />}
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirm}
                errored={confirmPassword.length > 0 && password !== confirmPassword}
                trailing={
                  <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                    {showConfirm ? (
                      <EyeOff size={18} color={C.textMuted} />
                    ) : (
                      <Eye size={18} color={C.textMuted} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {password.length > 0 && password.length < 8 && (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 6,
                  marginLeft: 4,
                }}
              >
                Password needs at least 8 characters
              </Text>
            )}

            {/* Spacer between form and button */}
            <View style={{ height: 40 }} />

            {/* Sign up button */}
            <Pressable
              onPress={handleSignup}
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
                  <>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: isValid ? C.buttonPrimaryText : C.textMuted,
                        letterSpacing: 0.2,
                      }}
                    >
                      Create account
                    </Text>
                    <ArrowRight
                      size={18}
                      color={isValid ? C.buttonPrimaryText : C.textMuted}
                      strokeWidth={2.5}
                    />
                  </>
                )}
              </View>
            </Pressable>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: C.textSecondary,
                    textAlign: 'center',
                  }}
                >
                  Already have an account?{' '}
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', color: C.accent }}>Log in</Text>
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
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: C.textMuted,
            marginBottom: 2,
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
          style={{
            fontSize: 15,
            fontFamily: 'DMSans_500Medium',
            color: C.textPrimary,
            padding: 0,
          }}
        />
      </View>
      {trailing}
    </View>
  );
}
