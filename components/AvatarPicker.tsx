import { Check, Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AVATAR_BASE, AVATAR_UNLOCKABLE, getUnlockedAvatars } from '@/lib/avatars';
import type { AvatarConfig } from '@/lib/avatars';

interface AvatarPickerProps {
  selected: string;
  completedBoxes: number;
  onSelect: (emoji: string) => void;
}

export function AvatarPicker({ selected, completedBoxes, onSelect }: AvatarPickerProps) {
  const unlocked = getUnlockedAvatars(completedBoxes);
  const unlockedEmojis = new Set(unlocked.map((a) => a.emoji));

  const milestones = [1, 2, 3, 5, 10];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {AVATAR_BASE.map((a) => (
        <AvatarItem key={a.emoji} avatar={a} selected={selected === a.emoji} locked={false} onSelect={onSelect} />
      ))}
      {AVATAR_UNLOCKABLE.map((a, i) => {
        const isLocked = !unlockedEmojis.has(a.emoji);
        return (
          <AvatarItem
            key={`unlock-${a.emoji}`}
            avatar={a}
            selected={selected === a.emoji}
            locked={isLocked}
            lockLabel={`${milestones[i]} box${milestones[i] > 1 ? 'es' : ''}`}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

function AvatarItem({
  avatar,
  selected,
  locked,
  lockLabel,
  onSelect,
}: {
  avatar: AvatarConfig;
  selected: boolean;
  locked: boolean;
  lockLabel?: string;
  onSelect: (emoji: string) => void;
}) {
  return (
    <Pressable
      onPress={() => !locked && onSelect(avatar.emoji)}
      disabled={locked}
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: locked ? '#F3F4F6' : avatar.bg,
        borderWidth: selected ? 2.5 : 0,
        borderColor: '#1DB954',
        opacity: locked ? 0.5 : 1,
      }}
    >
      {locked ? (
        <View style={{ alignItems: 'center' }}>
          <Lock size={14} color="#9CA3AF" />
          {lockLabel && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 7, color: '#9CA3AF', marginTop: 1 }}>
              {lockLabel}
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 24 }}>{avatar.emoji}</Text>
          {selected && (
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#1DB954',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            >
              <Check size={8} color="#FFFFFF" />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
