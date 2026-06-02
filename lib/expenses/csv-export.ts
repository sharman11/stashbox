/**
 * CSV export for the expense tracker.
 *
 * Generates a UTF-8 CSV with one row per transaction. Writes to a temp file
 * via expo-file-system and hands it to expo-sharing so the user can save to
 * Files, mail it to themselves, or open in Sheets/Excel.
 *
 * Format columns:
 *   Date, Type, Amount, Currency, Category, Note
 *
 * Note: we deliberately don't include a "Home currency equivalent" column —
 * FX rates change, so a frozen value in CSV would mislead. Users can do the
 * conversion themselves in a spreadsheet if they want.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { ExpenseCategory, ExpenseTransaction } from '../types';

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralize spreadsheet formula injection (CSV injection / DDE): a cell
  // starting with =, +, -, @, tab, or CR is executed as a formula by Excel/
  // Sheets. Prefix with a single quote so it's treated as literal text.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  // RFC 4180: wrap in quotes if value contains comma, quote, or newline; double-up inner quotes.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportTransactionsToCsv(
  transactions: readonly ExpenseTransaction[],
  categoryMap: ReadonlyMap<string, ExpenseCategory>,
): Promise<void> {
  if (transactions.length === 0) {
    throw new Error('No transactions to export.');
  }
  const header = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Note'];
  const lines: string[] = [header.map(csvEscape).join(',')];
  for (const t of transactions) {
    const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const row = [
      t.occurredOn,
      t.type,
      (t.amountCents / 100).toFixed(2),
      t.currency,
      cat?.name ?? '',
      t.note ?? '',
    ];
    lines.push(row.map(csvEscape).join(','));
  }
  const csv = lines.join('\n');

  const filename = `stashbox-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export expenses',
    UTI: 'public.comma-separated-values-text',
  });
}
