const STEPS = [
  {
    n: '01',
    title: 'Pick a goal',
    body:
      'Diwali fund, emergency stash, wedding, festival, travel. Anything with a number on it. Tell Stashbox the total and the timeline.',
  },
  {
    n: '02',
    title: 'Pick a stash spot',
    body:
      'Piggy bank, glass jar, envelope, matka, gullak, toilet tank, false-bottom can. 40+ options. The cash lives where you can see it.',
  },
  {
    n: '03',
    title: 'Fill a cell a day',
    body:
      'Stashbox generates a randomised grid of daily amounts that sum to your goal. Drop the cash, tap the cell. The streak takes care of itself.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          The whole loop in three steps.
        </h2>
        <p className="mt-4 max-w-2xl text-base sm:text-lg text-ink-soft leading-relaxed">
          No bank login. No fees. No money moves through the app. Stashbox keeps
          score so you can keep saving.
        </p>

        <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="rounded-2xl border border-black/5 bg-white p-6 sm:p-7 shadow-sm"
            >
              <div className="text-xs font-mono text-accent">{s.n}</div>
              <h3 className="mt-3 text-lg sm:text-xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-ink-soft leading-relaxed">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
