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

import { signUpWithEmail } from '@/lib/auth';

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

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid = isValidEmail && password.length >= 8 && password === confirmPassword;

  const handleSignup = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      // onAuthStateChange listener handles navigation
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
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
              Create your{'\n'}account
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.textSecondary, marginTop: 8 }}>
              Start your savings journey.
            </Text>

            {/* Error */}
            {error && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 16 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#DC2626' }}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={{ marginTop: 28, gap: 12 }}>
              {/* Email */}
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

              {/* Password */}
              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min 8 characters"
                    placeholderTextColor={C.textFaint}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    style={{ flex: 1, fontSize: 16, fontFamily: 'Inter_500Medium', color: C.textPrimary, padding: 0 }}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff size={18} color={C.textMuted} /> : <Eye size={18} color={C.textMuted} />}
                  </Pressable>
                </View>
              </View>

              {/* Confirm */}
              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: confirmPassword.length > 0 && password !== confirmPassword ? '#EF4444' : C.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={C.textFaint}
                  secureTextEntry={!showPassword}
                  style={{ fontSize: 16, fontFamily: 'Inter_500Medium', color: C.textPrimary, padding: 0 }}
                />
              </View>
            </View>

            {/* Sign up button */}
            <Pressable
              onPress={handleSignup}
              disabled={!isValid || loading}
              style={{
                backgroundColor: isValid ? C.accent : '#F3F4F6',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 24,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: isValid ? '#FFFFFF' : C.textFaint }}>
                  Sign up
                </Text>
              )}
            </Pressable>

            {/* Footer links */}
            <View style={{ alignItems: 'center', marginTop: 28, gap: 16 }}>
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary }}>
                  Already have an account?{' '}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: C.accent }}>Log in</Text>
                </Text>
              </Pressable>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
