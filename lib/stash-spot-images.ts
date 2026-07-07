import type { ImageSourcePropType } from 'react-native';

/**
 * Mascot-style illustrations for every stash spot, keyed by spot id.
 * require() needs static literals, so the map is spelled out. Falls back to
 * the spot's emoji wherever an id is missing (see getStashSpotImage callers).
 */
const STASH_SPOT_IMAGES: Record<string, ImageSourcePropType> = {
  piggy: require('@/assets/stash/spots/piggy.webp'),
  jar: require('@/assets/stash/spots/jar.webp'),
  envelope: require('@/assets/stash/spots/envelope.webp'),
  shoebox: require('@/assets/stash/spots/shoebox.webp'),
  tin: require('@/assets/stash/spots/tin.webp'),
  rice: require('@/assets/stash/spots/rice.webp'),
  flour: require('@/assets/stash/spots/flour.webp'),
  spice: require('@/assets/stash/spots/spice.webp'),
  fridge: require('@/assets/stash/spots/fridge.webp'),
  matka: require('@/assets/stash/spots/matka.webp'),
  gullak: require('@/assets/stash/spots/gullak.webp'),
  red_envelope: require('@/assets/stash/spots/red_envelope.webp'),
  bamboo: require('@/assets/stash/spots/bamboo.webp'),
  toilet_tank: require('@/assets/stash/spots/toilet_tank.webp'),
  toilet_paper: require('@/assets/stash/spots/toilet_paper.webp'),
  vent: require('@/assets/stash/spots/vent.webp'),
  medicine: require('@/assets/stash/spots/medicine.webp'),
  empty_bottle: require('@/assets/stash/spots/empty_bottle.webp'),
  plant: require('@/assets/stash/spots/plant.webp'),
  tennis_ball: require('@/assets/stash/spots/tennis_ball.webp'),
  frame: require('@/assets/stash/spots/frame.webp'),
  stair: require('@/assets/stash/spots/stair.webp'),
  stuffed: require('@/assets/stash/spots/stuffed.webp'),
  pantry_can: require('@/assets/stash/spots/pantry_can.webp'),
  wardrobe: require('@/assets/stash/spots/wardrobe.webp'),
  pillow: require('@/assets/stash/spots/pillow.webp'),
  jewelry: require('@/assets/stash/spots/jewelry.webp'),
  book: require('@/assets/stash/spots/book.webp'),
  wallet: require('@/assets/stash/spots/wallet.webp'),
  purse: require('@/assets/stash/spots/purse.webp'),
  backpack: require('@/assets/stash/spots/backpack.webp'),
  sticker_box: require('@/assets/stash/spots/sticker_box.webp'),
  dorm_drawer: require('@/assets/stash/spots/dorm_drawer.webp'),
  glovebox: require('@/assets/stash/spots/glovebox.webp'),
  toolbox: require('@/assets/stash/spots/toolbox.webp'),
  safe: require('@/assets/stash/spots/safe.webp'),
  lockbox: require('@/assets/stash/spots/lockbox.webp'),
  bank: require('@/assets/stash/spots/bank.webp'),
  fd: require('@/assets/stash/spots/fd.webp'),
  gift_card: require('@/assets/stash/spots/gift_card.webp'),
  gold_coin: require('@/assets/stash/spots/gold_coin.webp'),
  other: require('@/assets/stash/spots/other.webp'),
};

export function getStashSpotImage(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return STASH_SPOT_IMAGES[id] ?? null;
}
