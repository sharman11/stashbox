import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

/**
 * Apple touch icon — used when the site is added to an iOS home screen.
 *
 * Next 15 auto-discovers `app/apple-icon.tsx` and injects the
 * <link rel="apple-touch-icon"> tag. Rendered at 180×180: the squirrel
 * mascot on the brand-green field (iOS applies its own rounded mask).
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const mascot = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public/mascot/sequence/5.png'),
).toString('base64')}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B3D2E',
        }}
      >
        <img
          src={mascot}
          width={152}
          height={152}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size },
  );
}
