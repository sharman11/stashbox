/**
 * Where the user actually keeps the cash they're tracking with Stashbox.
 *
 * The product is a *tracker*, not a wallet - money never moves through the
 * app. Asking the user to commit to a real-world stash spot upfront makes
 * the metaphor obvious and gives the cash a home they'll actually go back to.
 *
 * The list spans demographics + cultures (kids, housewives, brides, students,
 * migrants; South Asia, Southeast Asia, Middle East, Africa, West) so most
 * users see at least one option that maps to a habit they already have.
 */

export interface StashSpot {
  id: string;
  emoji: string;
  label: string;
  /** Witty one-liner shown beneath the picker once selected. Light, never preachy. */
  tip: string;
}

export const STASH_SPOTS: readonly StashSpot[] = [
  // ── Classic ────────────────────────────────────────────────────────
  {
    id: 'piggy',
    emoji: '🐷',
    label: 'Piggy bank',
    tip: 'Classic for a reason. The smashing ceremony hits different.',
  },
  {
    id: 'jar',
    emoji: '🫙',
    label: 'Glass jar',
    tip: 'Watching coins pile up beats any bank app notification.',
  },
  {
    id: 'envelope',
    emoji: '✉️',
    label: 'Envelope',
    tip: 'Label it boldly. Tape it shut. Don’t peek.',
  },
  {
    id: 'shoebox',
    emoji: '📦',
    label: 'Shoebox',
    tip: 'Under the bed, behind the suitcase. Pro mode.',
  },
  {
    id: 'tin',
    emoji: '🥫',
    label: 'Cookie tin',
    tip: 'The Quality Street tin lives forever. Use it.',
  },
  // ── Kitchen / household hide-spots (housewife / mom classics) ──────
  {
    id: 'rice',
    emoji: '🍚',
    label: 'Rice container',
    tip: 'Mom-grade security. No one ever checks the rice.',
  },
  {
    id: 'flour',
    emoji: '🌾',
    label: 'Flour jar',
    tip: 'Same energy as the rice tin. Bonus: messy to dig through.',
  },
  {
    id: 'spice',
    emoji: '🧂',
    label: 'Spice rack',
    tip: 'Empty masala dabba on the back row. Hidden in plain sight.',
  },
  {
    id: 'fridge',
    emoji: '🧊',
    label: 'Freezer foil pouch',
    tip: 'Wrapped in foil, marked "leftovers". Nobody touches that.',
  },
  // ── Cultural / regional ───────────────────────────────────────────
  {
    id: 'matka',
    emoji: '🍶',
    label: 'Clay matka',
    tip: 'Old school. You have to break it to get it. Ultimate commitment.',
  },
  {
    id: 'gullak',
    emoji: '🪙',
    label: 'Gullak / kumbh',
    tip: 'Traditional clay coin pot. Drop change in, snap it open at Diwali.',
  },
  {
    id: 'red_envelope',
    emoji: '🧧',
    label: 'Red envelope',
    tip: 'Hong bao energy. Lucky money grows the fastest.',
  },
  {
    id: 'bamboo',
    emoji: '🎍',
    label: 'Bamboo coin tube',
    tip: 'Southeast Asian classic. Slot only - no cheating yourself.',
  },
  // ── Bathroom (the genuinely sneaky ones) ──────────────────────────
  {
    id: 'toilet_tank',
    emoji: '🚽',
    label: 'Toilet tank',
    tip: 'Waterproof bag, taped to the lid. The classic. (Burglars know it - use it for fun, not Fort Knox.)',
  },
  {
    id: 'toilet_paper',
    emoji: '🧻',
    label: 'TP roll core',
    tip: 'Slip a roll of bills inside the cardboard tube. The original paper wallet.',
  },
  {
    id: 'vent',
    emoji: '🌬️',
    label: 'Air vent',
    tip: 'Pop the grille off, tape a pouch behind it. Out of sight, literally.',
  },
  {
    id: 'medicine',
    emoji: '💊',
    label: 'Pill bottle',
    tip: 'Empty pill bottle in the medicine cabinet. Childproof from yourself too.',
  },
  {
    id: 'empty_bottle',
    emoji: '🧴',
    label: 'Empty shampoo',
    tip: 'Old lotion or shampoo bottle, labelled "almost done". Nobody touches those.',
  },
  // ── Around the house (heist-movie energy) ─────────────────────────
  {
    id: 'plant',
    emoji: '🪴',
    label: 'Potted plant',
    tip: 'Sealed bag, buried under the soil. Just remember to water around it.',
  },
  {
    id: 'tennis_ball',
    emoji: '🎾',
    label: 'Tennis ball',
    tip: 'Slit one, slip cash in, hide among the others. Genius for unused gym bags.',
  },
  {
    id: 'frame',
    emoji: '🖼️',
    label: 'Picture frame',
    tip: 'Tape an envelope to the back of a wall frame. Dust-free zone, zero suspicion.',
  },
  {
    id: 'stair',
    emoji: '🪜',
    label: 'Loose stair',
    tip: 'If you’re handy: hinge a step, drop cash in. Pure heist-movie energy.',
  },
  {
    id: 'stuffed',
    emoji: '🧸',
    label: 'Stuffed toy',
    tip: 'Slit the seam, tuck cash in, sew it back. Every kid’s first vault.',
  },
  {
    id: 'pantry_can',
    emoji: '🥫',
    label: 'False-bottom can',
    tip: 'A cereal box, soup can, or fake "beans" tin. Looks pantry, opens vault.',
  },
  // ── Personal / wearable ───────────────────────────────────────────
  {
    id: 'wardrobe',
    emoji: '🧥',
    label: 'Wardrobe',
    tip: 'Inside a sock you’d never wear. Genius.',
  },
  {
    id: 'pillow',
    emoji: '🛏️',
    label: 'Under the mattress',
    tip: 'Grandma-approved. Just remember which side.',
  },
  {
    id: 'jewelry',
    emoji: '💍',
    label: 'Jewelry box',
    tip: 'Stash it with the gold. Bride mode.',
  },
  {
    id: 'book',
    emoji: '📚',
    label: 'Book pages',
    tip: 'Pick a book you’d never re-read. Slip cash between pages 47 and 48.',
  },
  {
    id: 'wallet',
    emoji: '👛',
    label: 'Wallet pouch',
    tip: 'Separate compartment only. Hands off the rest.',
  },
  {
    id: 'purse',
    emoji: '👜',
    label: 'Purse pocket',
    tip: 'Inner zip pocket. The one you forget exists.',
  },
  // ── Kids / students ────────────────────────────────────────────────
  {
    id: 'backpack',
    emoji: '🎒',
    label: 'Backpack pocket',
    tip: 'Front pocket of your everyday bag. Goes everywhere with you.',
  },
  {
    id: 'sticker_box',
    emoji: '🪅',
    label: 'Decorated box',
    tip: 'Sticker-bombed shoebox. Make it personal so you’ll go back to it.',
  },
  {
    id: 'dorm_drawer',
    emoji: '🗄️',
    label: 'Drawer',
    tip: 'Bedside or desk. Same drawer, every time. No exceptions.',
  },
  // ── On the go / car / garage ──────────────────────────────────────
  {
    id: 'glovebox',
    emoji: '🚗',
    label: 'Car glovebox',
    tip: 'Locked glovebox or under the seat. Emergency-fund energy.',
  },
  {
    id: 'toolbox',
    emoji: '🧰',
    label: 'Toolbox',
    tip: 'Bottom of the toolbox, under the rusty wrenches. Camouflage tier-1.',
  },
  // ── Office / formal ────────────────────────────────────────────────
  {
    id: 'safe',
    emoji: '🔒',
    label: 'Safe / locker',
    tip: 'Combination only you know. Serious mode.',
  },
  {
    id: 'lockbox',
    emoji: '🗝️',
    label: 'Lock box',
    tip: 'Cheap key-lock cash box from any stationery shop. Surprisingly motivating.',
  },
  {
    id: 'bank',
    emoji: '🏦',
    label: 'Bank account',
    tip: 'Open a separate one. Don’t mix it with your spending account.',
  },
  {
    id: 'fd',
    emoji: '📜',
    label: 'Recurring deposit',
    tip: 'For real long-haul goals. Lock it up so you can’t see it.',
  },
  {
    id: 'gift_card',
    emoji: '💳',
    label: 'Pre-paid card',
    tip: 'Top up a gift card or prepaid wallet. Out of sight, out of habit.',
  },
  // ── Wedding / large goals ─────────────────────────────────────────
  {
    id: 'gold_coin',
    emoji: '🪙',
    label: 'Gold / silver coin',
    tip: 'Convert cash to small coins as you save. Inflation-proof flex.',
  },
  // ── Fallback ───────────────────────────────────────────────────────
  {
    id: 'other',
    emoji: '✨',
    label: 'Somewhere else',
    tip: 'Wherever works. Just be consistent - go back to the same spot every time.',
  },
];

export const DEFAULT_STASH_SPOT_ID = 'piggy';

export function getStashSpot(id: string | null | undefined): StashSpot | null {
  if (!id) return null;
  return STASH_SPOTS.find((s) => s.id === id) ?? null;
}
