import type { Metadata } from 'next';

import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy · Stashbox',
  description:
    'How Stashbox collects, uses, and protects your information. Plain language, no dark patterns.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="May 2026">
      <p>
        Stashbox (“we”, “us”, “the app”) is a tracker for cash you save offline.
        We don’t move your money, and we don’t connect to your bank. This page
        explains what data we do collect, why, and how to remove it.
      </p>

      <h2>1. What we collect</h2>
      <p>
        We collect only what the app needs to work and to keep your account
        secure across devices.
      </p>
      <ul>
        <li>
          <strong>Account data.</strong> Email and a salted password hash, used
          for sign-in. We never see your plaintext password.
        </li>
        <li>
          <strong>Profile data.</strong> Display name, avatar choice, preferred
          currencies, and your in-app settings (sound, haptics, theme).
        </li>
        <li>
          <strong>Moneybox data.</strong> Goals you create, the cells inside
          each grid, streaks, milestones, and which cells you’ve marked as
          filled. These are amounts you typed yourself. Stashbox has no way to
          verify whether the cash is actually in your jar.
        </li>
        <li>
          <strong>Device data.</strong> Crash logs and basic diagnostic data
          (OS version, device model) to help us fix bugs.
        </li>
      </ul>

      <h2>2. What we don’t collect</h2>
      <ul>
        <li>We do not collect your real-world financial accounts.</li>
        <li>We do not collect contacts, photos, microphone audio, or precise location.</li>
        <li>We do not sell your data. We never will.</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To sync your moneyboxes across devices when you sign in.</li>
        <li>To send push notifications you opted into (daily reminders, streak nudges).</li>
        <li>To debug crashes and improve the app.</li>
      </ul>

      <h2>4. Where data is stored</h2>
      <p>
        Account, profile, and moneybox data is stored on Supabase (Postgres,
        encrypted in transit and at rest). Diagnostic data is processed by
        Expo / EAS for crash reporting. Push tokens are stored on Expo’s push
        service so we can send reminders.
      </p>

      <h2>5. Advertising</h2>
      <p>
        Stashbox uses Google AdMob to show optional rewarded ads (you watch an
        ad to unlock an avatar, an extra currency slot, or a streak freeze) and
        a small number of banner placements. AdMob’s privacy practices are
        documented at{' '}
        <a href="https://policies.google.com/technologies/ads">
          policies.google.com/technologies/ads
        </a>
        . You can reset your advertising identifier in your device settings at
        any time.
      </p>

      <h2>6. Children</h2>
      <p>
        Stashbox is not directed at children under 13. If you are a parent and
        believe your child has signed up, email{' '}
        <a href="mailto:hello@stashbox.app">hello@stashbox.app</a> and we will
        delete the account.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can export, edit, or delete your data at any time from{' '}
        <strong>Settings → Account</strong> inside the app, or by emailing{' '}
        <a href="mailto:hello@stashbox.app">hello@stashbox.app</a>. Deletion is
        permanent and typically completes within 30 days.
      </p>

      <h2>8. Changes</h2>
      <p>
        If we change this policy in any material way, we’ll surface a notice
        inside the app the next time you open it. Continued use of Stashbox
        after a change means you accept the updated policy.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions, requests, or concerns:{' '}
        <a href="mailto:hello@stashbox.app">hello@stashbox.app</a>.
      </p>
    </LegalLayout>
  );
}
