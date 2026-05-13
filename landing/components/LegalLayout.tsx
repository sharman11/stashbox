import Link from 'next/link';

import { Footer } from './Footer';
import { Logo } from './Logo';

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-paper">
      <header className="bg-hero-gradient text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-6 sm:py-6">
          <Link href="/" aria-label="Back to Stashbox home">
            <Logo className="text-white" />
          </Link>
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition"
          >
            ← Back
          </Link>
        </div>
        <div className="mx-auto max-w-4xl px-5 pb-12 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/65">Last updated {updated}</p>
        </div>
      </header>

      <article className="legal mx-auto max-w-3xl px-5 py-12 text-ink leading-relaxed sm:px-6 sm:py-16">
        {children}
      </article>

      <Footer />
    </main>
  );
}
