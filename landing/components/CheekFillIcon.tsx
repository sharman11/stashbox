'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll-driven cheek-fill mascot icon.
 *
 * The squirrel's cheeks fill in lock-step with overall page scroll progress:
 * flat at the top, bursting by the footer. Used as the nav-bar logo mark, so
 * the sticky nav keeps it visible — and animating — the whole way down.
 *
 * All 5 frames are stacked and toggled by opacity so there is no decode
 * flicker as the active frame changes. Size is controlled by `className`.
 */

const FRAME_COUNT = 5;

interface CheekFillIconProps {
  className?: string;
}

export function CheekFillIcon({ className }: CheekFillIconProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setFrame(Math.round(progress * (FRAME_COUNT - 1)));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span
      className={`relative inline-block ${className ?? ''}`}
      role="img"
      aria-label="Stashbox squirrel mascot — page scroll progress"
    >
      {Array.from({ length: FRAME_COUNT }, (_, i) => (
        <img
          key={i}
          src={`/mascot/sequence/${i + 1}.png`}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: i === frame ? 1 : 0 }}
        />
      ))}
    </span>
  );
}
