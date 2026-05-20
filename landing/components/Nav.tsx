'use client';

import { useEffect, useState } from 'react';

import { CheekFillIcon } from './CheekFillIcon';

/**
 * Sticky top navigation.
 *
 * The logo mark is the scroll-driven cheek-fill mascot: as the page scrolls,
 * the sticky nav keeps it pinned in view and its cheeks fill with progress.
 *
 * The bar is transparent while the page is at the top (sitting over the
 * green hero) and fades in a translucent dark-green background once the
 * user scrolls.
 */

const SCROLL_THRESHOLD = 16;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <nav
      className={[
        'sticky top-0 z-50 h-14 transition-colors duration-300',
        scrolled
          ? 'border-b border-white/10 bg-[#0B3D2E]/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2 font-semibold text-white"
          aria-label="Stashbox home"
        >
          <CheekFillIcon className="h-9 w-9" />
          <span className="text-[17px] tracking-tight">Stashbox</span>
        </a>

        <div className="flex items-center gap-5 sm:gap-7">
          <div className="hidden items-center gap-7 text-sm text-white/80 md:flex">
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#who" className="transition hover:text-white">
              Who it’s for
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=com.stashbox.app&hl=en_IN"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get Stashbox on Google Play"
            className="inline-block transition hover:opacity-90"
          >
            <img
              src="/google-play-badge.png"
              alt="Get it on Google Play"
              className="h-9 w-auto"
            />
          </a>
        </div>
      </div>
    </nav>
  );
}
