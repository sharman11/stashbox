'use client';

import { useEffect, useState } from 'react';

/**
 * Stashbox landing-page loading splash.
 *
 * Mirrors the app's cold-boot splash (components/SplashAnimation.tsx):
 *  1. Cheek fill — the Gullu mascot plays through 5 frames once, empty ->
 *     bursting, then holds on the full frame.
 *  2. Wordmark — letters of "Stashbox" fade up with a stagger.
 *  3. Footer — "FROM Optruvian" fades in last.
 *  4. Exit — the whole overlay fades out and scales up, then unmounts.
 *
 * Plays on every page load. Skipped entirely when the user prefers
 * reduced motion.
 */

const FRAME_COUNT = 5;
const FRAME_MS = 150;
const WORDMARK = 'Stashbox';

// Timeline (ms), matched to the app splash.
const FILL_PASS_MS = FRAME_COUNT * FRAME_MS; // 750
const LETTER_START_MS = FILL_PASS_MS + 120; // 870
const LETTER_STAGGER_MS = 40;
const LETTER_DURATION_MS = 240;
const FOOTER_DELAY_MS = LETTER_START_MS + WORDMARK.length * LETTER_STAGGER_MS + 200;
const HOLD_MS = 650;
const EXIT_MS = 400;

export function LandingSplash() {
  // `false` until the mount effect runs. This keeps the server and first
  // client render identical (nothing rendered), avoiding a hydration
  // mismatch, and lets us check prefers-reduced-motion client-side only.
  const [visible, setVisible] = useState(false);
  const [decided, setDecided] = useState(false);
  const [frame, setFrame] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    setDecided(true);
    // Plays on every page load; only skipped for reduced-motion users.
    if (reduceMotion) return;
    setVisible(true);
  }, []);

  // Lock body scroll while the splash covers the page.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // Cheek-fill frame cycle — advance once, hold on the bursting frame.
  useEffect(() => {
    if (!visible) return;
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setFrame(index);
      if (index >= FRAME_COUNT - 1) window.clearInterval(id);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  // Exit sequence — fade out after the animation settles, then unmount.
  useEffect(() => {
    if (!visible) return;
    const exitAt = FOOTER_DELAY_MS + 500 + HOLD_MS;
    const startExit = window.setTimeout(() => setExiting(true), exitAt);
    const unmount = window.setTimeout(() => setVisible(false), exitAt + EXIT_MS);
    return () => {
      window.clearTimeout(startExit);
      window.clearTimeout(unmount);
    };
  }, [visible]);

  if (!decided || !visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background:
          'linear-gradient(160deg, #0B3D2E 0%, #145A42 55%, #1E7A5C 100%)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.08)' : 'scale(1)',
        transition: `opacity ${EXIT_MS}ms cubic-bezier(0.4,0,1,1), transform ${EXIT_MS}ms cubic-bezier(0.4,0,1,1)`,
      }}
    >
      <div className="flex flex-col items-center">
        {/* Cheek fill — all 5 frames stacked, only the active one opaque. */}
        <div className="relative h-[136px] w-[136px]">
          {Array.from({ length: FRAME_COUNT }, (_, i) => (
            <img
              key={i}
              src={`/mascot/sequence/${i + 1}.png`}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ opacity: i === frame ? 1 : 0 }}
            />
          ))}
        </div>

        {/* Wordmark — letters fade up with a stagger. */}
        <div className="mt-3.5 flex">
          {WORDMARK.split('').map((char, i) => (
            <span
              key={i}
              className="text-2xl font-bold tracking-tight text-white"
              style={{
                animation: `splash-letter ${LETTER_DURATION_MS}ms ease-out both`,
                animationDelay: `${LETTER_START_MS + i * LETTER_STAGGER_MS}ms`,
              }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* Footer — fades in last. */}
      <div
        className="absolute bottom-10 flex flex-col items-center gap-0.5"
        style={{
          animation: 'splash-fade-in 600ms ease-out both',
          animationDelay: `${FOOTER_DELAY_MS}ms`,
        }}
      >
        <span className="text-[10px] font-medium tracking-[0.1em] text-white/45">
          FROM
        </span>
        <span className="text-[13px] font-bold tracking-[0.04em] text-white/70">
          Optruvian
        </span>
      </div>
    </div>
  );
}
