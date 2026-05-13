'use client';

import { useCallback, useEffect, useState } from 'react';

import { HeroDecoration } from './HeroDecoration';
import { Logo } from './Logo';
import { PhoneMock } from './PhoneMock';
import { THEMES, type ThemeId } from './themes';

const PREF_KEY = 'stashbox.landing.prefs';

interface Prefs {
  theme: ThemeId;
  sound: boolean;
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return { theme: 'green', sound: true };
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return { theme: 'green', sound: true };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: parsed.theme && parsed.theme in THEMES ? parsed.theme : 'green',
      sound: parsed.sound !== false,
    };
  } catch {
    return { theme: 'green', sound: true };
  }
}

export function Hero() {
  const [themeId, setThemeId] = useState<ThemeId>('green');
  const [sound, setSound] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setThemeId(prefs.theme);
    setSound(prefs.sound);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      window.localStorage.setItem(
        PREF_KEY,
        JSON.stringify({ theme: themeId, sound }),
      );
    } catch {
      /* storage unavailable — silently skip */
    }
  }, [themeId, sound, prefsLoaded]);

  const theme = THEMES[themeId];

  const toggleSound = useCallback(() => setSound((s) => !s), []);

  return (
    <section
      className="relative overflow-hidden text-white transition-[background] duration-500"
      style={{
        background: `linear-gradient(160deg, ${theme.heroStart} 0%, ${theme.heroMid} 50%, ${theme.heroEnd} 100%)`,
      }}
    >
      <HeroDecoration theme={theme} />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-16 lg:pb-20">
        <header className="flex items-center justify-between gap-3">
          <Logo className="text-white" />
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#who" className="hover:text-white transition">Who it’s for</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
        </header>

        <div className="mt-8 grid items-center gap-8 sm:mt-12 md:mt-14 md:grid-cols-[1.1fr_minmax(0,0.9fr)] md:gap-8 lg:gap-12">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: theme.accent }}
              />
              Coming soon
            </p>
            <h1 className="text-[2rem] leading-[1.08] sm:text-[2.75rem] md:text-5xl lg:text-[3.25rem] lg:leading-[1.05] font-semibold tracking-tight">
              Save real cash,
              <br />
              <span style={{ color: theme.accent }}>one cell at a time.</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-base lg:text-lg text-white/75 leading-relaxed">
              A daily habit for cash you save offline. Jar, envelope, piggy
              bank, gullak, or any of 40+ stash spots. Pick a goal, fill a cell
              a day. That’s the whole thing.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#how"
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:brightness-110"
                style={{
                  background: theme.accent,
                  boxShadow: `0 10px 25px -10px rgba(${theme.cellGlowRgb}, 0.55)`,
                }}
              >
                See how it works
                <span aria-hidden>→</span>
              </a>
              <a
                href="#faq"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/5 px-5 py-3 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/10 transition"
              >
                Read the FAQ
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <StoreBadge label="Coming soon" sub="Google Play" />
              <StoreBadge label="Coming soon" sub="App Store" />
            </div>
          </div>

          <div className="relative flex flex-col items-center">
            <PhoneMock theme={theme} soundEnabled={sound} />
            <DemoControls
              activeTheme={themeId}
              onThemeChange={setThemeId}
              sound={sound}
              onToggleSound={toggleSound}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoControls({
  activeTheme,
  onThemeChange,
  sound,
  onToggleSound,
}: {
  activeTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  sound: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-1 rounded-full bg-black/30 p-1 ring-1 ring-white/10 backdrop-blur">
      {(['green', 'ocean', 'gold'] as const).map((id) => {
        const t = THEMES[id];
        const active = id === activeTheme;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onThemeChange(id)}
            aria-pressed={active}
            aria-label={`Switch to ${t.name} theme`}
            title={`${t.name} theme`}
            className={[
              'grid h-7 w-7 place-items-center rounded-full transition',
              active ? 'ring-2 ring-white' : 'opacity-75 hover:opacity-100',
            ].join(' ')}
          >
            <span
              aria-hidden
              className="h-4 w-4 rounded-full ring-1 ring-white/30"
              style={{ background: t.swatch }}
            />
          </button>
        );
      })}
      <div className="mx-0.5 h-4 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={sound}
        aria-label={sound ? 'Mute coin sound' : 'Unmute coin sound'}
        title={sound ? 'Sound on, click to mute' : 'Sound off, click to unmute'}
        className="grid h-7 w-7 place-items-center rounded-full text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>{sound ? '🔊' : '🔇'}</span>
      </button>
    </div>
  );
}

function StoreBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black/30 px-3.5 py-2.5 ring-1 ring-white/10">
      <span aria-hidden className="text-white/70">▶</span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-white/50">
          {label}
        </div>
        <div className="text-sm text-white/85">{sub}</div>
      </div>
    </div>
  );
}
