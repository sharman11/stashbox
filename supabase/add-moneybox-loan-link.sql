-- Links a moneybox (savings vault) to a student loan, so a "Payoff Booster"
-- vault can suggest an extra loan payment when it completes. Nullable: most
-- vaults aren't loan-linked. ON DELETE SET NULL so deleting the loan just
-- unlinks the vault (the savings stay intact).
--
-- Run once in Supabase → SQL Editor.

alter table public.moneyboxes
  add column if not exists linked_loan_id uuid
  references public.loans (id) on delete set null;

-- Helps the home/loans screens look up "is there a booster vault for this loan?"
create index if not exists moneyboxes_linked_loan_id_idx
  on public.moneyboxes (linked_loan_id)
  where linked_loan_id is not null;
