import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';

interface BackupData {
  version: 1;
  exportedAt: string;
  moneyboxes: Record<string, unknown>[];
  cells: Record<string, unknown>[];
  streaks: Record<string, unknown>[];
}

export async function exportBackup(userId: string): Promise<void> {
  const { data: moneyboxes } = await supabase
    .from('moneyboxes')
    .select('*')
    .eq('user_id', userId);

  const boxIds = (moneyboxes ?? []).map((b) => b.id);

  const { data: cells } = await supabase
    .from('cells')
    .select('*')
    .in('moneybox_id', boxIds);

  const { data: streaks } = await supabase
    .from('streaks')
    .select('*')
    .in('moneybox_id', boxIds);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    moneyboxes: moneyboxes ?? [],
    cells: cells ?? [],
    streaks: streaks ?? [],
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `stashbox-backup-${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Stashbox backup',
    UTI: 'public.json',
  });
}

export async function importBackup(userId: string): Promise<{ imported: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { imported: 0 };
  }

  const pickedFile = new File(result.assets[0].uri);
  const content = await pickedFile.text();

  let backup: BackupData;
  try {
    backup = JSON.parse(content);
  } catch {
    throw new Error('Invalid backup file - could not parse JSON.');
  }

  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  let imported = 0;

  for (const box of backup.moneyboxes) {
    const originalId = box.id as string;

    const { data: newBox, error: boxError } = await supabase
      .from('moneyboxes')
      .insert({
        user_id: userId,
        name: box.name,
        theme: box.theme,
        currency: box.currency,
        goal_amount: box.goal_amount,
        grid_rows: box.grid_rows,
        grid_cols: box.grid_cols,
        status: box.status,
      })
      .select()
      .single();

    if (boxError || !newBox) continue;

    const boxCells = backup.cells
      .filter((c) => c.moneybox_id === originalId)
      .map((c) => ({
        moneybox_id: newBox.id,
        row: c.row,
        col: c.col,
        amount: c.amount,
        is_filled: c.is_filled,
        filled_at: c.filled_at,
      }));

    if (boxCells.length > 0) {
      await supabase.from('cells').insert(boxCells);
    }

    const boxStreak = backup.streaks.find((s) => s.moneybox_id === originalId);
    if (boxStreak) {
      await supabase.from('streaks').upsert({
        moneybox_id: newBox.id,
        current_days: boxStreak.current_days,
        best_days: boxStreak.best_days,
        last_filled_date: boxStreak.last_filled_date,
      });
    }

    imported++;
  }

  return { imported };
}
