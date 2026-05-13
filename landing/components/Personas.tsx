const PERSONAS = [
  {
    emoji: '🪔',
    title: 'The festival saver',
    body:
      'Stashing for Diwali, Eid, Christmas, Pongal, or Chinese New Year. Has a date. Needs a number. Forgets to start until November.',
  },
  {
    emoji: '💍',
    title: 'The wedding fund',
    body:
      'Six-to-eighteen-month horizon. Multiple contributors. A goal big enough to scare a spreadsheet.',
  },
  {
    emoji: '🚨',
    title: 'The emergency fund',
    body:
      'Three months of rent + groceries, stashed offline so it doesn’t leak into Swiggy. The financial-advice classic nobody actually does.',
  },
  {
    emoji: '🎓',
    title: 'The student',
    body:
      'Hostel allowance, part-time gig money, festival giftings. Small denominations, big dreams, weekly cadence.',
  },
  {
    emoji: '🏠',
    title: 'The household saver',
    body:
      'Kid’s school fees, parents’ anniversary, the next AC. Cash in a rice tin or a wardrobe envelope, the way mom did it.',
  },
  {
    emoji: '✈️',
    title: 'The migrant',
    body:
      'Sending money home, saving in two currencies, juggling a long-distance goal across a slow remittance window.',
  },
];

export function Personas() {
  return (
    <section id="who" className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Who it’s for
        </p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
          If you’ve ever kept cash in a jar, this is for you.
        </h2>
        <p className="mt-4 max-w-2xl text-base sm:text-lg text-ink-soft leading-relaxed">
          Stashbox doesn’t care how much you’re saving or what for. It cares
          that you do it every day, and that you can see it grow.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <article
              key={p.title}
              className="group rounded-2xl border border-black/5 bg-white p-6 sm:p-7 shadow-sm transition active:translate-y-px hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-3xl" aria-hidden>
                {p.emoji}
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                {p.title}
              </h3>
              <p className="mt-2 text-ink-soft leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
