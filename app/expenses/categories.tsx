import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Check,
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory, TransactionType } from '@/lib/types';

const EMOJI_OPTIONS = [
  '💰', '🍔', '🚗', '🏠', '🎬', '💼', '🛒', '☕', '🍕', '🍣',
  '✈️', '🛍️', '💊', '⛽', '📱', '🏋️', '🎵', '🎓', '🧾', '💻',
  '🎁', '🐶', '🧹', '👕', '⚡',
];

const COLOR_OPTIONS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#EF4444', '#06B6D4', '#84CC16', '#A855F7', '#F97316',
  '#14B8A6', '#6366F1',
];

export default function CategoriesScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useSessionStore((s) => s.userId);

  const categories = useExpenseCategoriesStore((s) => s.categories);
  const createCategory = useExpenseCategoriesStore((s) => s.create);
  const updateCategory = useExpenseCategoriesStore((s) => s.update);
  const archiveCategory = useExpenseCategoriesStore((s) => s.archive);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);

  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const expenseCats = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter((c) => c.type === 'income'), [categories]);

  const txnCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (!t.categoryId) continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  const onAdd = async () => {
    if (!userId || !name.trim()) return;
    try {
      await createCategory({
        userId,
        name: name.trim(),
        emoji,
        color,
        type: addType,
      });
      setName('');
      setEmoji(EMOJI_OPTIONS[0]);
      setColor(COLOR_OPTIONS[0]);
      setAddOpen(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('add category failed', e);
    }
  };

  const onDelete = (cat: ExpenseCategory) => {
    const count = txnCountByCategory.get(cat.id) ?? 0;
    const msg =
      count > 0
        ? `${count} transaction${count === 1 ? '' : 's'} use "${cat.name}". They'll keep their amounts but lose the category label.`
        : `Remove "${cat.name}"?`;
    Alert.alert('Delete category', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveCategory(cat.id);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('archive failed', e);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={26} color={C.textPrimary} strokeWidth={2.25} />
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary }}>
            Categories
          </Text>
          <SpringPressable onPress={() => setAddOpen((v) => !v)} haptic>
            <Plus size={24} color={C.accent} strokeWidth={2.5} />
          </SpringPressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Add new */}
          {addOpen && (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 4,
                marginBottom: 16,
                padding: 16,
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                gap: 12,
              }}
            >
              {/* Type toggle — same treatment as the transaction screen. */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: C.borderLight,
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                {(
                  [
                    { key: 'expense' as const, label: 'Expense', icon: TrendingDown, color: '#EF4444' },
                    { key: 'income' as const, label: 'Income', icon: TrendingUp, color: '#10B981' },
                  ]
                ).map((t) => {
                  const active = addType === t.key;
                  const Icon = t.icon;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setAddType(t.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        backgroundColor: active ? C.surface : 'transparent',
                        shadowColor: active ? '#000' : 'transparent',
                        shadowOpacity: 0.08,
                        shadowRadius: 5,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: active ? 2 : 0,
                      }}
                    >
                      <Icon size={14} color={active ? t.color : C.textMuted} strokeWidth={2.5} />
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 13,
                          color: active ? t.color : C.textMuted,
                        }}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Live preview tile + name in one box — the tile mirrors the
               *  emoji/color picks below, so what you compose is what you get. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: C.pageBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, 40))}
                  placeholder="Category name (e.g. Gym & Fitness)"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="words"
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 15,
                    color: C.textPrimary,
                    padding: 0,
                  }}
                />
              </View>

              <EmojiGrid selected={emoji} tint={color} onSelect={setEmoji} />
              <ColorDots selected={color} onSelect={setColor} />

              <SpringPressable
                onPress={onAdd}
                disabled={!name.trim()}
                haptic
                style={{
                  backgroundColor: name.trim() ? C.buttonPrimaryBg : C.borderLight,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 14,
                    color: name.trim() ? C.buttonPrimaryText : C.textMuted,
                  }}
                >
                  Add category
                </Text>
              </SpringPressable>
            </View>
          )}

          <CategoryGroup
            title="Expenses"
            categories={expenseCats}
            txnCountByCategory={txnCountByCategory}
            onUpdate={updateCategory}
            onDelete={onDelete}
          />
          <CategoryGroup
            title="Income"
            categories={incomeCats}
            txnCountByCategory={txnCountByCategory}
            onUpdate={updateCategory}
            onDelete={onDelete}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Shared pickers
 * ──────────────────────────────────────────────────────────────────── */

function EmojiGrid({
  selected,
  tint,
  onSelect,
}: {
  selected: string;
  tint: string;
  onSelect: (e: string) => void;
}) {
  const C = useAppTheme();
  return (
    <View>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          color: C.textMuted,
          marginBottom: 6,
          letterSpacing: 0.4,
        }}
      >
        EMOJI
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {EMOJI_OPTIONS.map((e) => (
          <Pressable
            key={e}
            onPress={() => onSelect(e)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: selected === e ? `${tint}22` : C.borderLight,
              borderWidth: selected === e ? 2 : 0,
              borderColor: tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ColorDots({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  const C = useAppTheme();
  return (
    <View>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          color: C.textMuted,
          marginBottom: 6,
          letterSpacing: 0.4,
        }}
      >
        COLOR
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {COLOR_OPTIONS.map((c) => {
          const active = selected === c;
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: c,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* A check beats a subtle ring — selection is unmissable. */}
              {active && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Category list
 * ──────────────────────────────────────────────────────────────────── */

function CategoryGroup({
  title,
  categories,
  txnCountByCategory,
  onUpdate,
  onDelete,
}: {
  title: string;
  categories: ExpenseCategory[];
  txnCountByCategory: Map<string, number>;
  onUpdate: (id: string, patch: { name?: string; emoji?: string; color?: string }) => Promise<void>;
  onDelete: (cat: ExpenseCategory) => void;
}) {
  const C = useAppTheme();
  // Inline editor state — one category at a time, whole look editable
  // (name, emoji AND color), not just the name.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEmoji, setDraftEmoji] = useState(EMOJI_OPTIONS[0]);
  const [draftColor, setDraftColor] = useState(COLOR_OPTIONS[0]);

  const startEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setDraftName(cat.name);
    setDraftEmoji(cat.emoji);
    setDraftColor(cat.color);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (trimmed) {
      await onUpdate(editingId, { name: trimmed, emoji: draftEmoji, color: draftColor });
    }
    setEditingId(null);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
          color: C.textMuted,
          letterSpacing: 0.5,
          paddingHorizontal: 20,
          marginBottom: 8,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {categories.length === 0 ? (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: C.textMuted,
            paddingHorizontal: 24,
            marginBottom: 4,
          }}
        >
          None yet.
        </Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 6 }}>
          {categories.map((c) => {
            const count = txnCountByCategory.get(c.id) ?? 0;
            const isEditing = editingId === c.id;

            if (isEditing) {
              return (
                <View
                  key={c.id}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: C.accent,
                    gap: 12,
                  }}
                >
                  {/* Live preview tile + name. */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: C.pageBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: `${draftColor}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{draftEmoji}</Text>
                    </View>
                    <TextInput
                      value={draftName}
                      onChangeText={(v) => setDraftName(v.slice(0, 40))}
                      autoFocus
                      onSubmitEditing={commitEdit}
                      style={{
                        flex: 1,
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 15,
                        color: C.textPrimary,
                        padding: 0,
                      }}
                    />
                  </View>

                  <EmojiGrid selected={draftEmoji} tint={draftColor} onSelect={setDraftEmoji} />
                  <ColorDots selected={draftColor} onSelect={setDraftColor} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <SpringPressable
                      onPress={commitEdit}
                      disabled={!draftName.trim()}
                      haptic
                      style={{
                        flex: 1,
                        backgroundColor: draftName.trim() ? C.accent : C.borderLight,
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 13,
                          color: draftName.trim() ? '#FFFFFF' : C.textMuted,
                        }}
                      >
                        Save
                      </Text>
                    </SpringPressable>
                    <Pressable
                      onPress={() => setEditingId(null)}
                      hitSlop={6}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(c)} hitSlop={6} style={{ padding: 8 }}>
                      <Trash2 size={18} color="#94A3B8" />
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <Pressable
                key={c.id}
                onPress={() => startEdit(c)}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${c.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 15,
                      color: C.textPrimary,
                    }}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 11,
                      color: C.textMuted,
                      marginTop: 1,
                    }}
                  >
                    {count === 0 ? 'No transactions' : `${count} transaction${count === 1 ? '' : 's'}`}
                    {c.isDefault ? ' · default' : ''}
                  </Text>
                </View>
                <Pencil size={14} color={C.textFaint} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
