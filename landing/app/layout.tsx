import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';

import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0B3D2E',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Resolve the absolute origin for metadata (OG image, canonical URLs).
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL — set in Vercel once the real domain is live.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's public production
 *      alias (e.g. stashbox-six.vercel.app). Publicly accessible.
 *   3. VERCEL_URL — the per-deployment hostname. AVOID for OG metadata:
 *      on team accounts these URLs are gated behind Vercel SSO (returns
 *      401 to external validators), so og:image becomes unreachable.
 *   4. localhost fallback for `next dev`.
 */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stashbox · A daily habit for cash you save offline',
  description:
    'A daily habit tracker for cash you save offline. Jar, envelope, piggy bank, gullak, or any of 40+ stash spots. Pick a goal, fill a cell a day, hit your target.',
  metadataBase: new URL(siteUrl()),
  openGraph: {
    title: 'Stashbox · A daily habit for cash you save offline',
    description:
      'Pick a goal. Pick where the cash lives: jar, envelope, piggy bank, gullak, or any of 40+ stash spots. Fill one cell a day. That is the whole thing.',
    url: siteUrl(),
    type: 'website',
    siteName: 'Stashbox',
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Stashbox · Save real cash, one cell at a time.',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stashbox · A daily habit for cash you save offline',
    description:
      'Pick a goal. Pick where the cash lives: jar, envelope, piggy bank, gullak, or any of 40+ stash spots. Fill one cell a day. That is the whole thing.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: siteUrl(),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is scoped to <html> only. It silences the
    // false-positive that fires when browser extensions (Grammarly, Dark
    // Reader, Colorzilla, etc.) inject attributes onto the root element
    // before React hydrates. Children still get full hydration checks.
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
