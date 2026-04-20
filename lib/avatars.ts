export interface AvatarConfig {
  emoji: string;
  bg: string;
}

export const AVATAR_BASE: AvatarConfig[] = [
  { emoji: '🐷', bg: '#FECDD3' },
  { emoji: '🦊', bg: '#FED7AA' },
  { emoji: '🐸', bg: '#BBF7D0' },
  { emoji: '🐱', bg: '#E9D5FF' },
  { emoji: '🐶', bg: '#FDE68A' },
  { emoji: '🦁', bg: '#FDBA74' },
  { emoji: '🐼', bg: '#E5E7EB' },
  { emoji: '🦄', bg: '#FBCFE8' },
  { emoji: '🐲', bg: '#A5F3FC' },
  { emoji: '🤖', bg: '#BBF7D0' },
];

export const AVATAR_UNLOCKABLE: AvatarConfig[] = [
  { emoji: '👑', bg: '#FDE68A' },
  { emoji: '🏆', bg: '#FDE68A' },
  { emoji: '💎', bg: '#BBF7D0' },
  { emoji: '🚀', bg: '#C4B5FD' },
  { emoji: '⭐', bg: '#FDE68A' },
];

export function getUnlockedAvatars(completedBoxes: number): AvatarConfig[] {
  const unlocked: AvatarConfig[] = [];
  if (completedBoxes >= 1) unlocked.push(AVATAR_UNLOCKABLE[0]);
  if (completedBoxes >= 2) unlocked.push(AVATAR_UNLOCKABLE[1]);
  if (completedBoxes >= 3) unlocked.push(AVATAR_UNLOCKABLE[2]);
  if (completedBoxes >= 5) unlocked.push(AVATAR_UNLOCKABLE[3]);
  if (completedBoxes >= 10) unlocked.push(AVATAR_UNLOCKABLE[4]);
  return unlocked;
}

export function getAvailableAvatars(completedBoxes: number): AvatarConfig[] {
  return [...AVATAR_BASE, ...getUnlockedAvatars(completedBoxes)];
}

export const DEFAULT_AVATAR: AvatarConfig = AVATAR_BASE[0];
