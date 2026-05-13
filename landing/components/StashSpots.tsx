const SPOTS = [
  { emoji: '🐷', label: 'Piggy bank' },
  { emoji: '🫙', label: 'Glass jar' },
  { emoji: '✉️', label: 'Envelope' },
  { emoji: '🪙', label: 'Gullak' },
  { emoji: '🍶', label: 'Clay matka' },
  { emoji: '🧧', label: 'Red envelope' },
  { emoji: '🍚', label: 'Rice container' },
  { emoji: '📚', label: 'Book pages' },
  { emoji: '🧸', label: 'Stuffed toy' },
  { emoji: '🪴', label: 'Potted plant' },
  { emoji: '🥫', label: 'False-bottom can' },
  { emoji: '🔒', label: 'Safe / locker' },
  { emoji: '🏦', label: 'Bank account' },
  { emoji: '📜', label: 'Recurring deposit' },
  { emoji: '✨', label: '+ 26 more' },
];

export function StashSpots() {
  return (
    <section id="stash" className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              The cash lives somewhere real
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              40+ stash spots, because everyone saves differently.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-ink-soft leading-relaxed">
              Every moneybox commits to a stash spot. The actual place the cash
              lives. Classic piggy bank for the kids. Clay matka for the Diwali
              fund. Toilet-tank ziplock for heist-movie energy. Bank account or
              recurring deposit for the long-haul goals.
            </p>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Naming the spot gives the cash a home you’ll actually go back to.
              That’s the whole game.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {SPOTS.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-2 text-sm shadow-sm"
              >
                <span aria-hidden>{s.emoji}</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
