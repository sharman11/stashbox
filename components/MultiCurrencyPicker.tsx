import { Check, Search, Sparkles, Star, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  CURRENCIES,
  getRegionGroups,
  getSuggestedPairs,
  matchesQuery,
} from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { MAX_CURRENCIES } from '@/lib/moneybox-limits';
import { useAppTheme } from '@/lib/stores/theme';

interface MultiCurrencyPickerProps {
  /** Selected currencies, primary at index 0. */
  selected: CurrencyCode[];
  onChange: (next: CurrencyCode[]) => void;
  /** Currencies that are locked (e.g., because there's an active moneybox in them). */
  lockedCodes?: readonly CurrencyCode[];
  /** Show the inline cap helper text under the search box. */
  showCapHelper?: boolean;
}

export function MultiCurrencyPicker({
  selected,
  onChange,
  lockedCodes = [],
  showCapHelper = true,
}: MultiCurrencyPickerProps) {
  const C = useAppTheme();
  const [query, setQuery] = useState('');

  const primary = selected[0] ?? null;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const lockedSet = useMemo(() => new Set(lockedCodes), [lockedCodes]);
  const atCap = selected.length >= MAX_CURRENCIES;

  const suggested = useMemo(() => {
    if (!primary) return [] as CurrencyCode[];
    return getSuggestedPairs(primary).filter((c) => !selectedSet.has(c));
  }, [primary, selectedSet]);

  const regionGroups = useMemo(() => {
    const groups = getRegionGroups();
    if (!query.trim()) return groups;
    return groups
      .map((g) => ({
        region: g.region,
        currencies: g.currencies.filter((c) => matchesQuery(c, query)),
      }))
      .filter((g) => g.currencies.length > 0);
  }, [query]);

  const toggle = (code: CurrencyCode) => {
    if (lockedSet.has(code)) return;
    if (selectedSet.has(code)) {
      // Deselect (but never deselect the only remaining currency)
      if (selected.length === 1) return;
      onChange(selected.filter((c) => c !== code));
      return;
    }
    if (atCap) return; // hard cap
    onChange([...selected, code]);
  };

  const makePrimary = (code: CurrencyCode) => {
    if (!selectedSet.has(code) || code === primary) return;
    onChange([code, ...selected.filter((c) => c !== code)]);
  };

  return (
    <View>
      {/* Search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.borderLight,
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 44,
          gap: 8,
        }}
      >
        <Search size={16} color={C.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search currency or country"
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
          autoCapitalize="characters"
          style={{
            flex: 1,
            fontFamily: 'DMSans_500Medium',
            fontSize: 14,
            color: C.textPrimary,
            padding: 0,
          }}
        />
        {query.length > 0 && (
          <Pressable hitSlop={10} onPress={() => setQuery('')}>
            <X size={16} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {showCapHelper && (
        <View
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
            {selected.length}/{MAX_CURRENCIES} chosen · tap to add, long-press a chip to remove
          </Text>
        </View>
      )}

      {/* Selected chips (always visible so users can see + reorder primary) */}
      {selected.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <SectionHeader label="YOUR CURRENCIES" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selected.map((code) => {
              const isPrimary = code === primary;
              const meta = CURRENCIES[code];
              const locked = lockedSet.has(code);
              return (
                <Pressable
                  key={code}
                  onPress={() => makePrimary(code)}
                  onLongPress={() => toggle(code)}
                  delayLongPress={350}
                  style={{
                    backgroundColor: isPrimary ? C.buttonPrimaryBg : C.surface,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: isPrimary ? C.buttonPrimaryBg : C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{meta.flag}</Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 13,
                      color: isPrimary ? C.buttonPrimaryText : C.textPrimary,
                    }}
                  >
                    {meta.code}
                  </Text>
                  {isPrimary ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                      <Star size={11} color={C.buttonPrimaryText} fill={C.buttonPrimaryText} />
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: C.buttonPrimaryText }}>
                        PRIMARY
                      </Text>
                    </View>
                  ) : locked ? (
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: C.textMuted, marginLeft: 2 }}>
                      · in use
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {selected.length > 1 && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted, marginTop: 8 }}>
              Tap any chip to make it primary. Long-press to remove.
            </Text>
          )}
        </View>
      )}

      {/* Suggested pairs (only if no search query) */}
      {!query.trim() && suggested.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={12} color={C.accent} />
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 11,
                color: C.accent,
                letterSpacing: 0.5,
              }}
            >
              SUGGESTED FOR {primary}
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            {suggested.map((code) => (
              <CurrencyRow
                key={code}
                code={code}
                selected={false}
                disabled={atCap}
                onPress={() => toggle(code)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Region groups */}
      <View style={{ marginTop: 18, gap: 14 }}>
        {regionGroups.length === 0 && (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: C.textMuted,
              textAlign: 'center',
              paddingVertical: 24,
            }}
          >
            {`No currencies match “${query}”.`}
          </Text>
        )}
        {regionGroups.map((g) => (
          <View key={g.region}>
            <SectionHeader label={g.region.toUpperCase()} />
            <View style={{ gap: 8 }}>
              {g.currencies.map((code) => {
                const isSelected = selectedSet.has(code);
                const isPrimary = code === primary;
                const locked = lockedSet.has(code);
                const disabled = !isSelected && atCap;
                return (
                  <CurrencyRow
                    key={code}
                    code={code}
                    selected={isSelected}
                    isPrimary={isPrimary}
                    locked={locked}
                    disabled={disabled}
                    onPress={() => toggle(code)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {atCap && (
        <View
          style={{
            marginTop: 16,
            backgroundColor: C.warnBg,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 14 }}>ℹ️</Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.warnText,
              flex: 1,
              lineHeight: 18,
            }}
          >
            You&apos;ve picked the max of {MAX_CURRENCIES} currencies. Long-press one to remove it before adding another.
          </Text>
        </View>
      )}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  const C = useAppTheme();
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        color: C.textMuted,
        letterSpacing: 0.5,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

interface CurrencyRowProps {
  code: CurrencyCode;
  selected: boolean;
  isPrimary?: boolean;
  locked?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function CurrencyRow({ code, selected, isPrimary, locked, disabled, onPress }: CurrencyRowProps) {
  const C = useAppTheme();
  const meta = CURRENCIES[code];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? C.accent : C.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 22 }}>{meta.flag}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.textPrimary }}
            >
              {meta.code}
            </Text>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textMuted }}
            >
              {meta.symbol}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginTop: 2 }}
          >
            {meta.label}
            {locked ? ' · in use' : ''}
          </Text>
        </View>
      </View>
      {selected ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isPrimary ? '#F59E0B' : C.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPrimary ? (
            <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Check size={12} color="#FFFFFF" />
          )}
        </View>
      ) : (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: C.border,
          }}
        />
      )}
    </Pressable>
  );
}

/** Static helper export so other surfaces can reuse the scrollable wrap. */
export function MultiCurrencyPickerScroll(props: MultiCurrencyPickerProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <MultiCurrencyPicker {...props} />
    </ScrollView>
  );
}
