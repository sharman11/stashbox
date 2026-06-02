import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
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
          <Pressable onPress={() => setAddOpen((v) => !v)} hitSlop={10}>
            <Plus size={24} color={C.accent} strokeWidth={2.5} />
          </Pressable>
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
              {/* Type toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: C.borderLight,
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                {(['expense', 'income'] as TransactionType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setAddType(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: addType === t ? C.surface : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 13,
                        color: addType === t ? C.textPrimary : C.textMuted,
                      }}
                    >
                      {t === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Name */}
              <TextInput
                value={name}
                onChangeText={(v) => setName(v.slice(0, 40))}
                placeholder="Category name (e.g. Gym & Fitness)"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 15,
                  color: C.textPrimary,
                  backgroundColor: C.pageBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />

              {/* Emoji picker */}
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
                      onPress={() => setEmoji(e)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: emoji === e ? `${color}22` : C.borderLight,
                        borderWidth: emoji === e ? 2 : 0,
                        borderColor: color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Color picker */}
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
                  {COLOR_OPTIONS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: c,
                        borderWidth: color === c ? 3 : 0,
                        borderColor: C.surface,
                        shadowColor: color === c ? c : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                      }}
                    />
                  ))}
                </View>
              </View>

              <Pressable
                onPress={onAdd}
                disabled={!name.trim()}
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
              </Pressable>
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
  onUpdate: (id: string, patch: { name?: string }) => Promise<void>;
  onDelete: (cat: ExpenseCategory) => void;
}) {
  const C = useAppTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const startRename = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setRenameText(cat.name);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const trimmed = renameText.trim();
    if (trimmed) await onUpdate(editingId, { name: trimmed });
    setEditingId(null);
    setRenameText('');
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
            return (
              <View
                key={c.id}
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
                  {isEditing ? (
                    <TextInput
                      value={renameText}
                      onChangeText={(v) => setRenameText(v.slice(0, 40))}
                      autoFocus
                      onBlur={commitRename}
                      onSubmitEditing={commitRename}
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 15,
                        color: C.textPrimary,
                        padding: 0,
                      }}
                    />
                  ) : (
                    <Pressable onPress={() => startRename(c)}>
                      <Text
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
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={() => onDelete(c)} hitSlop={6}>
                  <Trash2 size={18} color="#94A3B8" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
