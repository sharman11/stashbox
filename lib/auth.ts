import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import { supabase } from './supabase';

/* ── Helpers ─────────────────────────────────────────────────────── */

export async function getIsAnonymous(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.is_anonymous === true;
}

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/* ── Email/Password ──────────────────────────────────────────────── */

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const { data: { session } } = await supabase.auth.getSession();
  const isAnon = session?.user?.is_anonymous === true;

  if (isAnon) {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
        throw new Error('This email is already in use. Try logging in instead.');
      }
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      throw new Error('This email is already in use. Try logging in instead.');
    }
    throw new Error(error.message);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.');

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Incorrect email or password.');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please check your email and confirm your account first.');
    }
    throw new Error(error.message);
  }
}

export async function resetPassword(email: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.');
  const redirectUrl = Linking.createURL('auth/callback');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  if (error) throw new Error(error.message);
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw new Error(error.message);
}

/* ── Delete Account ──────────────────────────────────────────────── */

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');

  // Calls the public.delete_user() Postgres function (SECURITY DEFINER)
  // which deletes the auth user; cascading FKs on auth.users remove all
  // owned rows (profiles, moneyboxes, cells, streaks, push_tokens).
  const { error } = await supabase.rpc('delete_user');
  if (error) throw new Error(error.message);

  await AsyncStorage.multiRemove([
    'stashbox_weekly_activity',
    'stashbox_last_daily_bonus',
    'stashbox_login_streak',
    'stashbox_avatar',
    'stashbox_ad_dismissed',
    'stashbox_personality',
  ]);

  await supabase.auth.signOut({ scope: 'local' });
  await supabase.auth.signInAnonymously();
}

/* ── Sign Out ────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  // Clear all user-scoped local data
  await AsyncStorage.multiRemove([
    'stashbox_weekly_activity',
    'stashbox_last_daily_bonus',
    'stashbox_login_streak',
    'stashbox_avatar',
    'stashbox_ad_dismissed',
    'stashbox_personality',
  ]);

  // Sign out only. Do NOT immediately call signInAnonymously() here — it
  // races with the explicit router.replace('/(auth)/login') in profile.tsx
  // and the auth-guard in _layout.tsx, sometimes bouncing the user back to
  // home before the new anon SIGNED_IN event reaches the listener. The
  // anonymous-fallback for fresh launches is handled in session.ts init().
  await supabase.auth.signOut({ scope: 'local' });
}
