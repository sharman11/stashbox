import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';

import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0B3D2E',
  width: 'device-width',
  initialScale: 1,
};

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stashbox · Save real cash, one cell at a time',
  description:
    'A daily habit tracker for cash you save offline. Jar, envelope, piggy bank, gullak, or any of 40+ stash spots. Pick a goal, fill a cell a day, hit your target.',
  metadataBase: new URL('https://stashbox.app'),
  openGraph: {
    title: 'Stashbox · Save real cash, one cell at a time',
    description:
      'Turn the way you already save cash into a daily habit. Goal, grid, streak, done.',
    type: 'website',
    siteName: 'Stashbox',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stashbox',
    description:
      'A daily habit tracker for the cash you save offline. Goal, grid, streak, done.',
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
