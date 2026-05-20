import Link from 'next/link';

import { Mascot } from '@/components/Mascot';

export const metadata = {
  title: 'Page not found · Stashbox',
};

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-[#0B3D2E] px-6 py-16 text-center text-white">
      <Mascot
        pose="lost-404"
        alt="Stashbox squirrel mascot looking lost"
        className="h-40 w-40 drop-shadow-xl sm:h-48 sm:w-48"
      />

      <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        This page wandered off.
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-white/70">
        Even the squirrel couldn’t find what you were looking for. Let’s get
        you back to somewhere that has cells to fill.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#0B3D2E] transition hover:brightness-95"
      >
        Back home
        <span aria-hidden>→</span>
      </Link>
    </main>
  );
}
