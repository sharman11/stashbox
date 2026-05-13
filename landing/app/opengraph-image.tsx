import { ImageResponse } from 'next/og';

/**
 * Dynamic Open Graph image for the Stashbox landing site.
 *
 * Next 15 auto-discovers any `opengraph-image.tsx` inside the App Router
 * and serves it at `/opengraph-image` with the right meta tags injected
 * into <head>. Twitter cards reuse this file when no separate
 * `twitter-image.tsx` exists.
 *
 * Rendered by Satori (via @vercel/og under the hood). Notes on the engine:
 *   - Every node uses inline styles (no Tailwind classes).
 *   - Any container with multiple children must set display: 'flex'.
 *   - Default font is a system sans-serif. Fine for a tight, design-rich
 *     card; switch to a fetched DM Sans only if it visually matters.
 */

export const alt =
  'Stashbox — Save real cash, one cell at a time.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FILLED_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 1, 1, 1],
  [1, 1, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 0, 0],
];

function GridLogo() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: 130,
        height: 130,
        background: '#0B3D2E',
        padding: 12,
        borderRadius: 22,
        boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.55)',
      }}
    >
      {FILLED_PATTERN.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 6 }}>
          {row.map((cell, j) => (
            <div
              key={j}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background:
                  cell === 1 ? '#1DB954' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(160deg, #0B3D2E 0%, #145A42 50%, #1E7A5C 100%)',
          padding: 80,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Subtle radial highlight in the top-left, mirrors the hero glow */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -160,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'rgba(29, 185, 84, 0.22)',
            filter: 'blur(40px)',
            display: 'flex',
          }}
        />

        {/* Top bar: logo + wordmark + "coming soon" pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <GridLogo />
            <div
              style={{
                color: 'white',
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              Stashbox
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 22,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#1DB954',
              }}
            />
            COMING SOON
          </div>
        </div>

        {/* Headline + tagline, pinned to lower half */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.04,
              letterSpacing: -3,
            }}
          >
            Save real cash,
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: '#1DB954',
              lineHeight: 1.04,
              letterSpacing: -3,
            }}
          >
            one cell at a time.
          </div>
          <div
            style={{
              fontSize: 30,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 32,
              maxWidth: 880,
              lineHeight: 1.35,
            }}
          >
            A daily habit for cash you save offline. Jar, envelope, piggy
            bank, gullak, or any of 40+ stash spots.
          </div>
        </div>

        {/* Footer right-aligned: domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 26,
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          stashbox.app
        </div>
      </div>
    ),
    { ...size },
  );
}
