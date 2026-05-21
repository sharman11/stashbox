import { Mascot } from './Mascot';

const FEATURES = [
  {
    title: 'Streaks that survive a bad week',
    body:
      'Auto-granted streak freezes cover missed days so one slip doesn’t reset months of effort.',
  },
  {
    title: 'Random grid generator',
    body:
      'You set the goal and the note denominations. Stashbox picks daily amounts that add up perfectly.',
  },
  {
    title: 'Multi-currency',
    body:
      'INR, USD, GBP, AED, SGD and more. Run multiple moneyboxes in different currencies side by side.',
  },
  {
    title: 'Milestones that feel earned',
    body:
      'Celebrations fire at 25, 50, 75, and 100% per moneybox. Once each. Never preachy.',
  },
  {
    title: 'Unlockable themes & badges',
    body:
      'Ocean, midnight, candy, dino, gold. Earn the next theme by finishing a moneybox or hitting a streak.',
  },
  {
    title: 'Mini-games & daily bonus',
    body:
      'Coin Merge, Snake, Memory Match, Whack-a-Coin. Earn badges, take a break, get back to saving.',
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[#0B3D2E] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Built around the way you already save.
            </h2>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/70 leading-relaxed">
              Not a bank. The habit that fills one.
            </p>
          </div>
          <Mascot
            pose="features-flex"
            alt=""
            className="pointer-events-none w-20 shrink-0 drop-shadow-xl md:w-28 lg:w-32"
          />
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#0B3D2E] p-6 sm:p-7">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-white/65 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
