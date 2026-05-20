'use client';

import { useState } from 'react';

/**
 * Reusable mascot image.
 *
 * Renders a pose from `/public/mascot/{pose}.png`. If the file does not
 * exist yet (poses are generated and dropped in over time), the component
 * renders nothing instead of a broken-image icon — so section slots can be
 * pre-wired before the art lands.
 */

interface MascotProps {
  /** Pose file name without extension, e.g. 'faq-think'. */
  pose: string;
  /** Accessible description. Use '' for purely decorative placements. */
  alt: string;
  className?: string;
}

export function Mascot({ pose, alt, className }: MascotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={`/mascot/${pose}.png`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
