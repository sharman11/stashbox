import { Mascot } from './Mascot';

const ITEMS = [
  {
    q: 'Is Stashbox a bank?',
    a: 'No. Stashbox never moves your money. It’s a tracker for cash you save offline. Jar, envelope, piggy bank, gullak, anywhere else. You decide where the cash lives. Stashbox just keeps score.',
  },
  {
    q: 'Will it cost money?',
    a: 'The core loop will always be free. That covers moneyboxes, streaks, grids, milestones, and themes. A small set of cosmetic and convenience features will be paid post-launch. No paywalls on saving.',
  },
  {
    q: 'Do you connect to my bank account?',
    a: 'No, and we never will. No Account Aggregator. No Plaid. No screen-scraping. Stashbox has no way to see, move, or touch your real money.',
  },
  {
    q: 'Which platforms?',
    a: 'Android first, iOS shortly after. Watch the Play Store and the App Store badges in the hero. They go live the day each listing does.',
  },
  {
    q: 'Does it sync across devices?',
    a: 'Yes. Sign in once and your moneyboxes, streaks, and badges follow you to any device.',
  },
  {
    q: 'What if I miss a day?',
    a: 'Streak freezes cover the occasional miss so a bad week doesn’t reset months of effort. You get them automatically; you can earn more.',
  },
  {
    q: 'What currencies do you support?',
    a: 'INR is primary today. USD, GBP, EUR, AED, SGD, and a handful more are wired in. You can run multiple moneyboxes in different currencies at the same time.',
  },
  {
    q: 'Will my data be private?',
    a: 'Yes. We collect what the app needs to work and nothing more. Read the full policy on the privacy page.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Questions
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              The things people actually want to know.
            </h2>
          </div>
          <Mascot
            pose="faq-think"
            alt=""
            className="pointer-events-none hidden w-24 shrink-0 drop-shadow-lg sm:block lg:w-28"
          />
        </div>

        <div className="mt-8 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white shadow-sm">
          {ITEMS.map((it) => (
            <details key={it.q} className="group p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-[15px] sm:text-base md:text-lg font-medium text-ink">
                  {it.q}
                </span>
                <span
                  aria-hidden
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-base text-accent transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-ink-soft leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
