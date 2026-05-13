'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PhoneTheme } from './themes';

/**
 * Interactive phone mock. The cells are real buttons — tap any of them to
 * fill / unfill, or hit "Save" on the moneybox card to fill the next empty
 * cell. Balance, percentage, and cell counter update live. Coin-drop sound
 * plays on fill (toggleable via the sound prop). Theme is fully driven by
 * the `theme` prop so the hero theme-switcher can repaint it instantly.
 */

const TOTAL_CELLS = 30;
const INITIAL_FILLED = 14;
const DENOMINATIONS = [50, 100, 200, 500] as const;

function makeAmounts(): number[] {
  let seed = 11;
  const out: number[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out.push(DENOMINATIONS[seed % DENOMINATIONS.length]);
  }
  return out;
}

function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* haptics unavailable — graceful fallback */
    }
  }
}

const AUDIO_POOL_SIZE = 4;

function createAudioPool(): HTMLAudioElement[] {
  if (typeof Audio === 'undefined') return [];
  return Array.from({ length: AUDIO_POOL_SIZE }, () => {
    const a = new Audio('/coin-drop.mp3');
    a.preload = 'auto';
    a.volume = 0.55;
    return a;
  });
}

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

interface PhoneMockProps {
  theme: PhoneTheme;
  soundEnabled: boolean;
}

export function PhoneMock({ theme, soundEnabled }: PhoneMockProps) {
  const amounts = useMemo(makeAmounts, []);
  const goal = useMemo(() => amounts.reduce((a, b) => a + b, 0), [amounts]);

  const [filled, setFilled] = useState<number[]>(() =>
    Array.from({ length: INITIAL_FILLED }, (_, i) => i),
  );
  const [celebrate, setCelebrate] = useState(false);

  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const audioCursorRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    audioPoolRef.current = createAudioPool();
    return () => {
      for (const a of audioPoolRef.current) {
        try {
          a.pause();
        } catch {
          /* noop */
        }
      }
      audioPoolRef.current = [];
    };
  }, []);

  const playCoinDrop = useCallback(() => {
    if (!soundEnabledRef.current) return;
    const pool = audioPoolRef.current;
    if (pool.length === 0) return;
    const a = pool[audioCursorRef.current];
    audioCursorRef.current = (audioCursorRef.current + 1) % pool.length;
    try {
      a.currentTime = 0;
      void a.play().catch(() => undefined);
    } catch {
      /* audio unavailable — graceful fallback */
    }
  }, []);

  const filledSet = useMemo(() => new Set(filled), [filled]);
  const saved = useMemo(
    () => filled.reduce((sum, i) => sum + amounts[i], 0),
    [filled, amounts],
  );
  const percent = Math.round((saved / goal) * 100);
  const count = filled.length;

  useEffect(() => {
    if (count !== TOTAL_CELLS) return;
    setCelebrate(true);
    vibrate(80);
    const t = setTimeout(() => {
      setCelebrate(false);
      setFilled(Array.from({ length: INITIAL_FILLED }, (_, i) => i));
    }, 1600);
    return () => clearTimeout(t);
  }, [count]);

  const toggleCell = useCallback(
    (i: number) => {
      const willFill = !filledSet.has(i);
      if (willFill) {
        vibrate(8);
        playCoinDrop();
      }
      setFilled((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
      );
    },
    [filledSet, playCoinDrop],
  );

  const fillNext = useCallback(() => {
    if (count >= TOTAL_CELLS) return;
    vibrate(8);
    playCoinDrop();
    setFilled((prev) => {
      for (let i = 0; i < TOTAL_CELLS; i++) {
        if (!prev.includes(i)) return [...prev, i];
      }
      return prev;
    });
  }, [count, playCoinDrop]);

  const reset = useCallback(() => {
    setFilled(Array.from({ length: INITIAL_FILLED }, (_, i) => i));
    vibrate(4);
  }, []);

  return (
    <div className="relative mx-auto w-[min(70vw,250px)]">
      <div
        aria-hidden
        className={[
          'absolute -inset-10 -z-10 rounded-full blur-3xl transition-all duration-500',
          celebrate ? 'scale-110' : '',
        ].join(' ')}
        style={{
          backgroundColor: `rgba(${theme.cellGlowRgb}, ${celebrate ? 0.45 : 0.22})`,
        }}
      />

      <div className="relative aspect-[9/19.5] rounded-[2.5rem] bg-[#0A1F18] p-2 shadow-2xl ring-1 ring-white/10">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-black" />

        <div
          className="relative h-full w-full overflow-hidden rounded-[2.1rem] p-4 pt-8 transition-[background] duration-500"
          style={{
            background: `linear-gradient(to bottom, ${theme.heroStart} 0%, ${theme.heroMid} 55%, ${theme.heroEnd} 100%)`,
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-pink-200 text-sm ring-1 ring-white/20">
                  🐷
                </div>
                <span className="text-[10px] text-white/85">Hello, Sharman</span>
              </div>
              <div
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium text-white"
                style={{ background: theme.accent }}
              >
                <span aria-hidden>+</span> Moneybox
              </div>
            </div>

            <div className="mt-5" aria-live="polite">
              <div className="text-[9px] text-white/60">🇮🇳 INR</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums transition-all duration-300">
                ₹{formatINR(saved)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                <span className="tabular-nums" style={{ color: theme.accent }}>
                  {percent}% saved
                </span>
                <span className="text-white/35">·</span>
                <span className="text-white/55 tabular-nums">
                  of ₹{formatINR(goal)}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-black/35 p-3 ring-1 ring-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-white">
                  <span aria-hidden>🏠</span>
                  <span>Home</span>
                </div>
                <button
                  type="button"
                  onClick={fillNext}
                  disabled={count === TOTAL_CELLS}
                  className="rounded-full px-2 py-0.5 text-[9px] font-medium transition active:scale-95 hover:brightness-110 disabled:opacity-40"
                  style={{
                    background: theme.saveBg,
                    color: theme.saveText,
                    boxShadow: `inset 0 0 0 1px ${theme.saveRing}`,
                  }}
                  aria-label="Save the next empty cell"
                >
                  Save ›
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-6 gap-1">
                {amounts.map((amount, i) => {
                  const isFilled = filledSet.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleCell(i)}
                      aria-pressed={isFilled}
                      aria-label={`Cell ${i + 1}, ₹${amount}, ${
                        isFilled ? 'filled' : 'empty'
                      }`}
                      className="aspect-square rounded-[4px] transition-all duration-200 active:scale-90 hover:brightness-110"
                      style={
                        isFilled
                          ? {
                              background: theme.cellFilled,
                              boxShadow: `0 0 8px rgba(${theme.cellGlowRgb}, 0.45)`,
                            }
                          : { background: 'rgba(255,255,255,0.10)' }
                      }
                    />
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px]">
                <span className="text-white/55 tabular-nums">
                  {count} / {TOTAL_CELLS} cells
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="text-white/55 underline-offset-2 hover:text-white hover:underline"
                  aria-label="Reset the demo grid"
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2 rounded-2xl bg-black/35 p-2.5 ring-1 ring-white/5 backdrop-blur-sm">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs">
                ⚡
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-semibold text-white">
                  7-day streak
                </div>
                <div className="text-[9px] text-white/55">
                  {count === TOTAL_CELLS
                    ? 'Goal complete!'
                    : 'Keep it going today'}
                </div>
              </div>
            </div>
          </div>

          {celebrate && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <div className="animate-celebrate text-5xl">🎉</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes celebrate {
          0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
          40%  { transform: scale(1.25) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .animate-celebrate {
          animation: celebrate 600ms cubic-bezier(.2,.8,.2,1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-celebrate { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
