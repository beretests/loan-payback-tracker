create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (length(trim(source)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  received_on date not null,
  notes text,
  recurring_transaction_id uuid
    references public.recurring_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index income_entries_user_received_on_idx
  on public.income_entries (user_id, received_on desc)
  where deleted_at is null;

create unique index income_entries_recurring_occurrence_idx
  on public.income_entries (recurring_transaction_id, received_on)
  where recurring_transaction_id is not null;

create trigger income_entries_set_updated_at
before update on public.income_entries
for each row execute function private.set_updated_at();

alter table public.income_entries enable row level security;

create policy "income_entries_select_own"
  on public.income_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "income_entries_insert_own"
  on public.income_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "income_entries_update_own"
  on public.income_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.income_entries from anon, authenticated;
grant select, insert, update on public.income_entries to authenticated;
