import { Check, Search, Star, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  CURRENCIES,
  CURRENCY_LIST,
  getRegionGroups,
  matchesQuery,
  type CurrencyCode,
} from '@/lib/currency';
import { canCreate, maxForCurrency, type Limits } from '@/lib/moneybox-limits';
import { useAppTheme } from '@/lib/stores/theme';

interface CurrencyPickerProps {
  visible: boolean;
  current: CurrencyCode;
  /** Create-flow slot rules. When provided, rows show in-use / ad-gated /
   *  full badges and rule-breaking rows are disabled. Omit for a plain
   *  picker (e.g. transaction logging) where every currency is selectable. */
  limits?: Limits;
  /** Currencies pinned to the top section. Defaults to the in-use set
   *  derived from `limits` when present. */
  pinned?: CurrencyCode[];
  onSelect: (code: CurrencyCode) => void;
  onCancel: () => void;
}

const ALL_SELECTABLE: Status = { selectable: true, badge: null };

interface Status {
  selectable: boolean;
  badge: string | null;
  danger?: boolean;
}

/** Turn the create-rules for a currency into a row status: whether it can be
 *  picked and a short badge explaining its state (in use, ad-gated, full…). */
function statusFor(limits: Limits, code: CurrencyCode): Status {
  const count = limits.countPerCurrency.get(code) ?? 0;
  const max = maxForCurrency(limits, code);
  const check = canCreate(limits, code);
  if (check.allowed) {
    return { selectable: true, badge: count > 0 ? `In use · ${count}/${max}` : null };
  }
  switch (check.reason) {
    case 'NEED_UNLOCK':
      return { selectable: true, badge: 'Ad unlocks 2nd' };
    case 'OTHER_CURRENCY_HAS_BONUS':
      return { selectable: true, badge: 'Switch slot · ad' };
    case 'CURRENCY_FULL':
      return { selectable: false, badge: `Full · ${count}/${max}` };
    case 'MAX_CURRENCIES':
      return { selectable: false, badge: '3-currency max', danger: true };
  }
}

/**
 * Searchable bottom-sheet for picking the stashbox currency. Communicates the
 * "up to 3 currencies" budget with a slot meter, pins the user's in-use
 * currencies on top, and groups the rest by region. Rows that would break a
 * rule (4th currency, currency already full) are shown but disabled with a
 * reason, so the limit is legible instead of a surprise alert.
 */
export function CurrencyPicker({ visible, current, limits, pinned, onSelect, onCancel }: CurrencyPickerProps) {
  const C = useAppTheme();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setQuery('');
      Keyboard.dismiss();
    }
  }, [visible]);

  const inUse = useMemo(
    () => pinned ?? (limits ? Array.from(limits.countPerCurrency.keys()) : []),
    [pinned, limits],
  );
  const regionGroups = useMemo(() => getRegionGroups(), []);
  const searching = query.trim().length > 0;

  const sections = useMemo<{ title: string | null; codes: CurrencyCode[] }[]>(() => {
    if (searching) {
      const matches = CURRENCY_LIST.filter((c) => matchesQuery(c.code, query)).map((c) => c.code);
      return [{ title: null, codes: matches }];
    }
    const out: { title: string | null; codes: CurrencyCode[] }[] = [];
    if (inUse.length > 0) out.push({ title: 'YOUR CURRENCIES', codes: inUse });
    for (const g of regionGroups) {
      // Don't repeat in-use currencies inside their region group.
      const codes = g.currencies.filter((c) => !inUse.includes(c));
      if (codes.length > 0) out.push({ title: g.region.toUpperCase(), codes });
    }
    return out;
  }, [searching, query, inUse, regionGroups]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.pageBg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: '85%',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingBottom: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderLight }} />
          </View>

          {/* Header: title + close. */}
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 20, color: C.textPrimary }}>
                Choose a currency
              </Text>
              <Pressable
                onPress={onCancel}
                hitSlop={10}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.surface,
                }}
              >
                <X size={18} color={C.textSecondary} />
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 14,
              }}
            >
              <Search size={16} color={C.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search currency or country"
                placeholderTextColor={C.textFaint}
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 15,
                  color: C.textPrimary,
                  padding: 0,
                }}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <X size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* List */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
          >
            {sections.every((s) => s.codes.length === 0) ? (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: C.textMuted,
                  textAlign: 'center',
                  paddingVertical: 32,
                }}
              >
                No currencies match “{query.trim()}”.
              </Text>
            ) : (
              sections.map((section) => (
                <View key={section.title ?? 'search'}>
                  {section.title && (
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 11,
                        letterSpacing: 0.8,
                        color: C.textMuted,
                        paddingHorizontal: 20,
                        paddingTop: 14,
                        paddingBottom: 6,
                      }}
                    >
                      {section.title}
                    </Text>
                  )}
                  {section.codes.map((code) => (
                    <CurrencyRow
                      key={code}
                      code={code}
                      selected={code === current}
                      isBonus={limits?.bonusCurrency === code}
                      status={limits ? statusFor(limits, code) : ALL_SELECTABLE}
                      onPress={() => onSelect(code)}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface CurrencyRowProps {
  code: CurrencyCode;
  selected: boolean;
  isBonus: boolean;
  status: Status;
  onPress: () => void;
}

function CurrencyRow({ code, selected, isBonus, status, onPress }: CurrencyRowProps) {
  const C = useAppTheme();
  const meta = CURRENCIES[code];
  return (
    <Pressable
      onPress={status.selectable ? onPress : undefined}
      disabled={!status.selectable}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 20,
        backgroundColor: selected ? C.accentLight : 'transparent',
        opacity: status.selectable ? 1 : 0.45,
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: 26 }}>
        {meta.flag}
      </Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.textPrimary }}>
            {meta.code}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textFaint }}>
            {meta.symbol}
          </Text>
          {isBonus && <Star size={12} color={C.accent} fill={C.accent} />}
        </View>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
          {meta.label}
        </Text>
      </View>
      {status.badge && (
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            color: status.danger ? '#DC2626' : C.textMuted,
            marginRight: selected ? 4 : 0,
          }}
        >
          {status.badge}
        </Text>
      )}
      {selected && <Check size={18} color={C.accent} />}
    </Pressable>
  );
}
