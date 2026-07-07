import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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

import { SpringPressable } from '@/components/SpringPressable';
import { requestEmailOtp, verifyEmailOtp } from '@/lib/auth';
import { useAppReadyStore } from '@/lib/stores/app-ready';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;

type Stage = 'email' | 'code';

/** Map raw auth-backend errors to copy that says what happened and what to
 *  do next, instead of "Token has expired or is invalid". */
function friendlyAuthError(e: unknown, stage: Stage): string {
  const raw = e instanceof Error ? e.message : '';
  const lower = raw.toLowerCase();
  if (lower.includes('expired') || lower.includes('invalid') || lower.includes('token')) {
    return "That code didn't match. Check for typos, or send a fresh one below.";
  }
  if (lower.includes('security purposes') || lower.includes('rate')) {
    return 'Too many attempts. Give it a minute, then try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'No connection. Check your internet and try again.';
  }
  if (raw) return raw;
  return stage === 'email' ? 'Could not send the code. Try again.' : 'Could not verify the code. Try again.';
}

export default function EmailOtpScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refresh = useSessionStore((s) => s.refresh);
  const userId = useSessionStore((s) => s.userId);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const transitioning = useSessionStore((s) => s.transitioning);
  const profile = useProfileStore((s) => s.profile);

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const splashExited = useAppReadyStore((s) => s.splashExited);

  // Defer the email field's autoFocus until the splash has exited. On cold
  // boot expo-router restores the persisted route behind the splash overlay;
  // a raw `autoFocus` here would open the keyboard beneath the splash, then
  // the keyboard closes as the splash fades — the visible "flash" the user
  // sees. On warm navigation splashExited is already true, so focus fires
  // immediately.
  useEffect(() => {
    if (stage !== 'email') return;
    if (!splashExited) return;
    emailInputRef.current?.focus();
  }, [stage, splashExited]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Auto-focus the code field when entering the code stage.
  useEffect(() => {
    if (stage === 'code') {
      // small delay so the keyboard pops once the screen is settled
      const t = setTimeout(() => codeInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Self-redirect if the user is already signed in. This handles the
  // cold-start race (stale restored route) the same way login.tsx does.
  if (!transitioning && userId && !isAnonymous && profile?.onboardingDone) {
    return <Redirect href="/" />;
  }
  if (!transitioning && userId && !isAnonymous && profile && !profile.onboardingDone) {
    return <Redirect href="/(auth)/signup" />;
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  const onSendCode = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    setError(null);
    useSessionStore.getState().setTransitioning(true);
    try {
      await requestEmailOtp(email.trim());
      setStage('code');
      setCode('');
      setResendIn(RESEND_COOLDOWN_SECS);
    } catch (e: unknown) {
      setError(friendlyAuthError(e, 'email'));
    } finally {
      setLoading(false);
      useSessionStore.getState().setTransitioning(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestEmailOtp(email.trim());
      setResendIn(RESEND_COOLDOWN_SECS);
      setCode('');
      lastSubmittedCode.current = null;
    } catch (e: unknown) {
      setError(friendlyAuthError(e, 'email'));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!codeValid || loading) return;
    lastSubmittedCode.current = code;
    setLoading(true);
    setError(null);
    useSessionStore.getState().setTransitioning(true);
    try {
      await verifyEmailOtp(email.trim(), code);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
      await refresh();
      // Routing happens via the Redirect at the top of this component on the
      // next render, driven by the now-updated session + profile state.
    } catch (e: unknown) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      }
      setError(friendlyAuthError(e, 'code'));
      // Clear the wrong code and refocus so retyping starts immediately.
      setCode('');
      lastSubmittedCode.current = null;
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
      useSessionStore.getState().setTransitioning(false);
    }
  };

  // Auto-submit the moment the 6th digit lands (typed, pasted, or OS
  // autofill) — the user should never have to tap Verify after autofill.
  const lastSubmittedCode = useRef<string | null>(null);
  useEffect(() => {
    if (stage !== 'code' || !codeValid || loading) return;
    if (lastSubmittedCode.current === code) return;
    onVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stage, codeValid, loading]);

  const onEditEmail = () => {
    setStage('email');
    setError(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => (stage === 'code' ? onEditEmail() : router.replace('/(auth)/welcome'))}
            hitSlop={10}
            accessibilityLabel="Back"
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={26} color={C.textPrimary} strokeWidth={2.25} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {stage === 'email' ? (
            <View>
              <Text style={[styles.h1, { color: C.textPrimary }]}>What&apos;s your email?</Text>
              <Text style={[styles.sub, { color: C.textSecondary }]}>
                We&apos;ll send you a 6-digit code. No password to remember.
              </Text>

              {error && <ErrorBanner message={error} />}

              <View
                style={{
                  marginTop: 20,
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: C.border,
                  paddingHorizontal: 14,
                  height: 60,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Mail size={18} color={C.textMuted} />
                <TextInput
                  ref={emailInputRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={C.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={onSendCode}
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 16,
                    color: C.textPrimary,
                    padding: 0,
                  }}
                />
              </View>

              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 10,
                  marginLeft: 4,
                  lineHeight: 16,
                }}
              >
                Same flow whether you&apos;re new or coming back. We&apos;ll figure it out.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.h1, { color: C.textPrimary }]}>Check your email</Text>
              <Text style={[styles.sub, { color: C.textSecondary }]}>
                Sent a code to <Text style={{ fontFamily: 'DMSans_600SemiBold' }}>{email}</Text>.
              </Text>

              {error && <ErrorBanner message={error} />}

              <View style={{ marginTop: 24 }}>
                <CodeInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setError(null);
                  }}
                  ref={codeInputRef}
                />
              </View>

              <Pressable onPress={onEditEmail} hitSlop={8} style={{ marginTop: 18 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: C.accent,
                    textAlign: 'center',
                  }}
                >
                  Wrong email? Edit it
                </Text>
              </Pressable>

              <Pressable
                onPress={onResend}
                disabled={resendIn > 0 || loading}
                hitSlop={8}
                style={{ marginTop: 12 }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: resendIn > 0 ? C.textMuted : C.accent,
                    textAlign: 'center',
                  }}
                >
                  {resendIn > 0
                    ? `Send again in ${resendIn}s`
                    : "Didn't get it? Send again"}
                </Text>
              </Pressable>

              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 18,
                  textAlign: 'center',
                  lineHeight: 16,
                  paddingHorizontal: 20,
                }}
              >
                The code can take up to a minute. If it doesn&apos;t turn up, check your spam folder.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Primary CTA */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: C.pageBg,
          }}
        >
          {(() => {
            const valid = stage === 'email' ? emailValid : codeValid;
            const disabled = loading || !valid;
            return (
              <SpringPressable
                onPress={stage === 'email' ? onSendCode : onVerify}
                disabled={disabled}
                haptic
                style={{
                  borderRadius: 16,
                  shadowColor: disabled ? 'transparent' : C.heroTop,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: disabled ? 0 : 6,
                }}
              >
                {/* Brand gradient when actionable — same treatment as the
                 *  welcome CTA the user just came from. */}
                <LinearGradient
                  colors={
                    disabled
                      ? [C.borderLight, C.borderLight, C.borderLight]
                      : [C.heroTop, C.heroMid, C.heroBot]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 16,
                          color: valid ? '#FFFFFF' : C.textMuted,
                          letterSpacing: 0.2,
                        }}
                      >
                        {stage === 'email' ? 'Send code' : 'Verify'}
                      </Text>
                      {valid && <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />}
                    </>
                  )}
                </LinearGradient>
              </SpringPressable>
            );
          })()}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Code input — six boxes that share a single hidden TextInput
 * ──────────────────────────────────────────────────────────────────── */

interface CodeInputProps {
  value: string;
  onChange: (v: string) => void;
}

// eslint-disable-next-line react/display-name
const CodeInput = ((props: CodeInputProps & { ref?: React.Ref<TextInput> }) => {
  const C = useAppTheme();
  const ref = (props as { ref?: React.Ref<TextInput> }).ref;
  const slots = Array.from({ length: CODE_LENGTH });
  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {slots.map((_, i) => {
          const digit = props.value[i];
          const filled = !!digit;
          const isCursor = i === props.value.length;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                aspectRatio: 0.82,
                borderRadius: 12,
                // Only the active slot pops — filled boxes already show
                // their digit, so accent-bordering them too made the cursor
                // position unreadable.
                borderWidth: isCursor ? 2 : 1.5,
                borderColor: isCursor ? C.accent : C.border,
                backgroundColor: isCursor ? `${C.accent}0D` : C.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 22,
                  color: C.textPrimary,
                }}
              >
                {digit ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Hidden field that the box display tracks. Tapping the boxes focuses
          this via parent's autofocus / refs. */}
      <TextInput
        ref={ref}
        value={props.value}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
          props.onChange(digits);
        }}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
        }}
      />
    </View>
  );
}) as React.ForwardRefExoticComponent<CodeInputProps & React.RefAttributes<TextInput>>;

/* ──────────────────────────────────────────────────────────────────────
 * Small bits
 * ──────────────────────────────────────────────────────────────────── */

function ErrorBanner({ message }: { message: string }) {
  const C = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: C.errorBg,
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: C.errorBg,
      }}
    >
      <Text
        numberOfLines={4}
        ellipsizeMode="tail"
        selectable
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          lineHeight: 18,
          color: C.errorText,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = {
  h1: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  } as const,
  sub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    marginTop: 6,
    lineHeight: 21,
  } as const,
};
