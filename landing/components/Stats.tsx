const STATS = [
  { value: '40+', label: 'Stash spots' },
  { value: '8', label: 'Themes' },
  { value: '4', label: 'Mini-games' },
  { value: '7', label: 'Currencies' },
];

export function Stats() {
  return (
    <section className="border-y border-black/5 bg-white py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-6 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
