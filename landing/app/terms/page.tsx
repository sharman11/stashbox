import type { Metadata } from 'next';

import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service · Stashbox',
  description:
    'The terms that apply when you use Stashbox. Short, readable, no legalese where we can help it.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="May 2026">
      <p>
        These terms apply when you use Stashbox. They’re short on purpose. If
        anything is unclear, write to{' '}
        <a href="mailto:sharmancm11@gmail.com">sharmancm11@gmail.com</a> and we’ll
        explain.
      </p>

      <h2>1. What Stashbox is</h2>
      <p>
        Stashbox is a habit-tracking app for cash you save offline. It is{' '}
        <strong>not</strong> a bank, a wallet, a payment processor, or a
        financial advisor. We do not hold, move, or have any claim on the
        money you’re tracking.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You need to be 13 or older to use Stashbox.</li>
        <li>You’re responsible for keeping your password secret.</li>
        <li>You’re responsible for the moneybox data you enter.</li>
      </ul>

      <h2>3. Your content stays yours</h2>
      <p>
        Goals, names, amounts, badges, photos. Whatever you put into Stashbox
        is yours. We only use it to run the app for you. We don’t train models
        on it, we don’t sell it, and we don’t share it except as described in
        the Privacy Policy.
      </p>

      <h2>4. Things we ask you not to do</h2>
      <ul>
        <li>Don’t try to break or reverse-engineer the app.</li>
        <li>Don’t use Stashbox to harm, harass, or defraud other people.</li>
        <li>Don’t scrape, resell, or rebrand the service.</li>
      </ul>

      <h2>5. No financial advice</h2>
      <p>
        Stashbox helps you build a saving habit. It does not give financial,
        tax, investment, or legal advice. The numbers you see in the app are
        based on what you typed, not on any account, bank, or market data. For
        decisions involving real money, talk to a qualified professional.
      </p>

      <h2>6. Availability</h2>
      <p>
        We try hard to keep Stashbox running, but we don’t guarantee zero
        downtime, zero bugs, or zero data loss. Don’t treat the app as the
        only record of how much you’ve saved. Count the cash now and then.
      </p>

      <h2>7. Termination</h2>
      <p>
        You can delete your account any time from Settings → Account. We may
        suspend or terminate accounts that abuse the service, violate these
        terms, or threaten the safety of other users.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the maximum extent allowed by law, Stashbox is provided “as is”
        without warranties of any kind, and we’re not liable for any indirect
        or consequential damages arising from your use of the app.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        If we change these terms materially, we’ll show a notice inside the
        app the next time you open it. Continued use means you accept the
        updated terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Anything we missed: <a href="mailto:sharmancm11@gmail.com">sharmancm11@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
