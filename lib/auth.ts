import AsyncStorage from '@react-native-async-storage/async-storage';

import { track } from './observability';
import { supabase } from './supabase';

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

export async function getIsAnonymous(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.is_anonymous === true;
}

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/* ──────────────────────────────────────────────────────────────────────
 * Email OTP (only auth path in v1)
 *
 * Flow:
 *   1. requestEmailOtp(email) — sends a 6-digit code, creates the user
 *      lazily if it's their first time. No password ever.
 *   2. verifyEmailOtp(email, code) — exchanges the code for a session.
 *
 * Returning users follow the exact same flow — Supabase doesn't reveal
 * whether the email already had an account, which sidesteps enumeration
 * attacks and lets us use one screen for both signup and login.
 *
 * Supabase Auth template requirement: the "Magic Link" email template
 * needs `{{ .Token }}` in the body so the 6-digit code is rendered.
 * Configure in: Dashboard → Authentication → Email Templates → Magic Link.
 * ──────────────────────────────────────────────────────────────────── */

export async function requestEmailOtp(email: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('That email doesn\'t look right.');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('rate limit') || msg.includes('too many')) {
      throw new Error('Too many tries. Give it a minute and try again.');
    }
    throw new Error(error.message);
  }
}

export async function verifyEmailOtp(email: string, code: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('That email doesn\'t look right.');
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from your email.');
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code,
    type: 'email',
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('expired')) {
      throw new Error('That code expired. Tap Send again for a fresh one.');
    }
    if (msg.includes('invalid') || msg.includes('incorrect')) {
      throw new Error('That code didn\'t match. Try again.');
    }
    throw new Error(error.message);
  }
  track('auth_completed');
}

/* ──────────────────────────────────────────────────────────────────────
 * Delete account
 * ──────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────────
 * Sign out
 * ──────────────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  // Remove this account's push tokens before signing out so a logged-out
  // device stops receiving its reminders. Uses the user's own RLS perms
  // (deletes only their rows). Best-effort — never block logout on this.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (uid) {
      await supabase.from('push_tokens').delete().eq('user_id', uid);
    }
  } catch {
    /* best-effort */
  }

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
  // races with the explicit router.replace('/(auth)/welcome') in profile.tsx
  // and the auth-guard in _layout.tsx, sometimes bouncing the user back to
  // home before the new anon SIGNED_IN event reaches the listener. The
  // anonymous-fallback for fresh launches is handled in session.ts init().
  await supabase.auth.signOut({ scope: 'local' });
}
