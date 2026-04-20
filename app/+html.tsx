import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B3D2E" />
        <meta name="application-name" content="Stashbox" />

        {/* iOS Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Stashbox" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        {/* SEO */}
        <meta name="description" content="Save money daily, one cell at a time. Set a goal, fill cells each day, and watch your savings grow." />

        <ScrollViewStyleReset />
      </head>
      <body style={{ overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
