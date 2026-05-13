-- Adds persistent milestone tracking to moneyboxes.
-- milestones_triggered holds the percentage thresholds (25, 50, 75, 100)
-- already celebrated for a given moneybox. Each threshold fires at most once
-- per vault lifecycle, and undo does NOT remove entries (milestones are
-- permanent achievements).

alter table public.moneyboxes
  add column if not exists milestones_triggered int[] not null default '{}'::int[];
