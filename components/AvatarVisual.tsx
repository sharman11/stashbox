import { Image, Text, View } from 'react-native';

import { DEFAULT_AVATAR, getAvatarById } from '@/lib/avatars';
import type { AvatarConfig } from '@/lib/avatars';

interface AvatarVisualProps {
  /** Either an avatar id (looked up in the catalog) or a full config. */
  avatar: string | AvatarConfig;
  /** Tile width/height in px. */
  size: number;
  /** Override tile background. Defaults to the avatar's own bg. */
  background?: string;
  /** When false, the tile is drawn flat with no rounded background -
   *  useful when the parent already provides a frame. */
  withBackground?: boolean;
}

/**
 * Single component that renders an avatar at any size, regardless of whether
 * the avatar is an emoji glyph or a static image asset. Use this everywhere
 * the user's avatar appears so adding new image-based avatars is a one-line
 * change in `lib/avatars.ts`.
 */
export function AvatarVisual({
  avatar,
  size,
  background,
  withBackground = true,
}: AvatarVisualProps) {
  const config = typeof avatar === 'string' ? getAvatarById(avatar) ?? DEFAULT_AVATAR : avatar;
  const bg = background ?? config.bg;
  // Image avatars (transparent PNGs) look best when they fill the tile.
  // Emoji glyphs need to sit at ~60% of the tile so they look proportional.
  const emojiSize = Math.round(size * 0.6);

  const content = config.kind === 'image' && config.image ? (
    <Image
      source={config.image}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  ) : (
    <Text style={{ fontSize: emojiSize }}>{config.emoji}</Text>
  );

  if (!withBackground) return content;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {content}
    </View>
  );
}
