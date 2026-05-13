'use client';

import { useMemo } from 'react';

import type { PhoneTheme, ThemeDecoration } from './themes';

/**
 * Ambient decoration layer that covers the entire hero section. Sprites
 * drift in place. Risers (used by underwater themes) rise from the bottom
 * of the section to the top, looping infinitely so it feels like the
 * whole hero is submerged.
 *
 * Positions and timing are seeded so SSR and the client render the same
 * layout, avoiding hydration mismatches.
 */

interface SpriteSpec {
  emoji: string;
  left: string;
  top: string;
  size: string;
  delay: string;
  duration: string;
}

interface RiserSpec {
  emoji: string;
  left: string;
  size: string;
  delay: string;
  duration: string;
  drift: number;
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s;
  };
}

function makeSprites(
  emojis: readonly string[],
  count: number,
  seed: number,
): SpriteSpec[] {
  const rand = makeRng(seed);
  const pool: string[] = [];
  while (pool.length < count) pool.push(...emojis);
  return pool.slice(0, count).map((emoji) => ({
    emoji,
    left: `${rand() % 95}%`,
    top: `${rand() % 90}%`,
    size: `${18 + (rand() % 14)}px`,
    delay: `${rand() % 5000}ms`,
    duration: `${5000 + (rand() % 4000)}ms`,
  }));
}

function makeRisers(
  emojis: readonly string[],
  count: number,
  seed: number,
): RiserSpec[] {
  const rand = makeRng(seed);
  const pool: string[] = [];
  while (pool.length < count) pool.push(...emojis);
  return pool.slice(0, count).map((emoji) => ({
    emoji,
    left: `${(rand() % 96) + 2}%`,
    size: `${14 + (rand() % 14)}px`,
    // Negative delay (start mid-cycle) so risers are scattered immediately
    // on first paint instead of all starting from the bottom together.
    delay: `-${rand() % 9000}ms`,
    duration: `${7000 + (rand() % 5000)}ms`,
    drift: (rand() % 30) - 15,
  }));
}

export function HeroDecoration({ theme }: { theme: PhoneTheme }) {
  const deco = theme.decorations;

  // Always call hooks unconditionally. When the theme has no decoration the
  // memoised arrays stay empty and the layer simply renders nothing.
  const sprites = useMemo<SpriteSpec[]>(() => {
    if (!deco) return [];
    const count = deco.mode === 'sparkle' ? 18 : 12;
    return makeSprites(deco.sprites, count, 23 + theme.id.length);
  }, [deco, theme.id]);

  const risers = useMemo<RiserSpec[]>(() => {
    if (!deco?.risers) return [];
    return makeRisers(deco.risers, 14, 47 + theme.id.length);
  }, [deco, theme.id]);

  if (!deco) return null;

  const spriteAnimation =
    deco.mode === 'sparkle' ? 'twinkle' : 'floatdrift';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {sprites.map((s, i) => (
        <span
          key={`${theme.id}-s-${i}`}
          className="absolute"
          style={{
            left: s.left,
            top: s.top,
            fontSize: s.size,
            opacity: deco.mode === 'sparkle' ? 0.65 : 0.55,
            animation: `${spriteAnimation} ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        >
          {s.emoji}
        </span>
      ))}
      {risers.map((r, i) => (
        <span
          key={`${theme.id}-r-${i}`}
          className="absolute"
          style={{
            left: r.left,
            bottom: '-24px',
            fontSize: r.size,
            opacity: 0.7,
            // Pass horizontal drift in via a CSS variable so the keyframe
            // can wobble laterally without us writing one keyframe per
            // sprite.
            ['--bx' as string]: `${r.drift}px`,
            animation: `bubblerise ${r.duration} linear ${r.delay} infinite`,
          }}
        >
          {r.emoji}
        </span>
      ))}

      <style>{`
        @keyframes floatdrift {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%      { transform: translateY(-8px) rotate(6deg); }
          50%      { transform: translateY(-14px) rotate(-4deg); }
          75%      { transform: translateY(-6px) rotate(3deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.85) rotate(-4deg); }
          50%      { opacity: 1;    transform: scale(1.1)  rotate(4deg); }
        }
        @keyframes bubblerise {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          10%  { opacity: 0.75; }
          50%  { transform: translate3d(var(--bx, 0), -55vh, 0); opacity: 0.75; }
          90%  { opacity: 0.5; }
          100% { transform: translate3d(0, -110vh, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="floatdrift"],
          [style*="twinkle"],
          [style*="bubblerise"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
