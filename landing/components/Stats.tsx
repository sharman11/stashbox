import { Mascot } from './Mascot';

const STATS = [
  { value: '40+', label: 'Stash spots' },
  { value: '8', label: 'Themes' },
  { value: '4', label: 'Mini-games' },
  { value: '7', label: 'Currencies' },
];

export function Stats() {
  return (
    <section className="relative border-y border-black/5 bg-white py-5 sm:py-8">
      <Mascot
        pose="stats-hoard"
        alt=""
        className="pointer-events-none absolute -top-12 right-4 hidden w-24 drop-shadow-lg lg:right-8 lg:block"
      />
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-x-2 px-5 sm:px-6">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-muted sm:text-xs sm:tracking-[0.18em]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
