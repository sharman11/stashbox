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
  // Delete all user data then sign out
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');

  const userId = session.user.id;

  // Delete in order: cells → moneyboxes → push_tokens → streaks → profile
  // Cascading deletes on auth.users will handle most of this,
  // but we clean up explicitly for safety
  await supabase.from('push_tokens').delete().eq('user_id', userId);
  await supabase.from('cells').delete().in(
    'moneybox_id',
    (await supabase.from('moneyboxes').select('id').eq('user_id', userId)).data?.map((b) => b.id) ?? [],
  );
  await supabase.from('streaks').delete().in(
    'moneybox_id',
    (await supabase.from('moneyboxes').select('id').eq('user_id', userId)).data?.map((b) => b.id) ?? [],
  );
  await supabase.from('moneyboxes').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);

  // Clear local storage
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

  await supabase.auth.signOut({ scope: 'local' });
  await supabase.auth.signInAnonymously();
}
