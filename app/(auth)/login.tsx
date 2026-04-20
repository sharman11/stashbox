import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff } from 'lucide-react-native';
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

import { resetPassword, signInWithEmail } from '@/lib/auth';

const C = {
  accent: '#1DB954',
  accentLight: '#E6F4EA',
  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#E5E7EB',
};

export default function LoginScreen() {
  const router = useRouter();
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
    try {
      await signInWithEmail(email.trim(), password);
      // onAuthStateChange listener will handle navigation
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
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
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 }}>
          <View style={{ paddingTop: 60 }}>
            {/* Header */}
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: C.textPrimary }}>
              Welcome{'\n'}back
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.textSecondary, marginTop: 8 }}>
              Log in to continue saving.
            </Text>

            {/* Error */}
            {error && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 16 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#DC2626' }}>{error}</Text>
              </View>
            )}

            {/* Reset sent */}
            {resetSent && (
              <View style={{ backgroundColor: C.accentLight, borderRadius: 12, padding: 12, marginTop: 16 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#166534' }}>
                  Password reset email sent to {email}
                </Text>
              </View>
            )}

            {/* Form */}
            <View style={{ marginTop: 28, gap: 12 }}>
              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={C.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={{ fontSize: 16, fontFamily: 'Inter_500Medium', color: C.textPrimary, padding: 0 }}
                />
              </View>

              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    placeholderTextColor={C.textFaint}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    style={{ flex: 1, fontSize: 16, fontFamily: 'Inter_500Medium', color: C.textPrimary, padding: 0 }}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff size={18} color={C.textMuted} /> : <Eye size={18} color={C.textMuted} />}
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.accent }}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={!isValid || loading}
              style={{
                backgroundColor: isValid ? C.accent : '#F3F4F6',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: isValid ? '#FFFFFF' : C.textFaint }}>
                  Log in
                </Text>
              )}
            </Pressable>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 28, gap: 16 }}>
              <Pressable onPress={() => router.replace('/(auth)/signup')}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary }}>
                  Don't have an account?{' '}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: C.accent }}>Sign up</Text>
                </Text>
              </Pressable>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
