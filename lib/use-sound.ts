import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const coinDropAsset = require('@/assets/sounds/coin-drop.wav');

const SOUNDS = {
  coin: coinDropAsset,
} as const;

type SoundName = keyof typeof SOUNDS;

export function useSoundEffect(name: SoundName) {
  const player = useAudioPlayer(SOUNDS[name]);

  const play = useCallback(() => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Silently fail — sound is non-critical
    }
  }, [player]);

  return play;
}
