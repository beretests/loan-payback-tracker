create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  color text not null default '#64748b'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create unique index expense_categories_user_name_active_idx
  on public.expense_categories (user_id, lower(name))
  where deleted_at is null;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  description text not null check (length(trim(description)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  spent_on date not null,
  payment_method text not null default 'other'
    check (
      payment_method in (
        'cash',
        'debit_card',
        'credit_card',
        'bank_transfer',
        'other'
      )
    ),
  expense_type text not null default 'ordinary'
    check (expense_type = 'ordinary'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint expenses_category_owner_fk
    foreign key (category_id, user_id)
    references public.expense_categories (id, user_id)
);

create index expenses_user_spent_on_idx
  on public.expenses (user_id, spent_on desc)
  where deleted_at is null;

create index expenses_user_category_idx
  on public.expenses (user_id, category_id)
  where deleted_at is null;

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  transaction_type text not null
    check (transaction_type in ('expense', 'income')),
  description text not null check (length(trim(description)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  cadence text not null default 'monthly' check (cadence = 'monthly'),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  payment_method text
    check (
      payment_method is null
      or payment_method in (
        'cash',
        'debit_card',
        'credit_card',
        'bank_transfer',
        'other'
      )
    ),
  starts_on date not null,
  ends_on date,
  next_occurrence_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint recurring_category_owner_fk
    foreign key (category_id, user_id)
    references public.expense_categories (id, user_id),
  constraint recurring_date_range_check
    check (ends_on is null or ends_on >= starts_on),
  constraint recurring_expense_category_check
    check (
      (transaction_type = 'expense' and category_id is not null)
      or (transaction_type = 'income' and category_id is null)
    )
);

create index recurring_transactions_user_due_idx
  on public.recurring_transactions (user_id, next_occurrence_on)
  where deleted_at is null and is_active;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function private.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function private.set_updated_at();

create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute function private.set_updated_at();

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.recurring_transactions enable row level security;

create policy "expense_categories_select_own"
  on public.expense_categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "expense_categories_insert_own"
  on public.expense_categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "expense_categories_update_own"
  on public.expense_categories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "expenses_select_own"
  on public.expenses for select to authenticated
  using (user_id = (select auth.uid()));
create policy "expenses_insert_own"
  on public.expenses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "expenses_update_own"
  on public.expenses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "recurring_transactions_select_own"
  on public.recurring_transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "recurring_transactions_insert_own"
  on public.recurring_transactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "recurring_transactions_update_own"
  on public.recurring_transactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.expense_categories from anon, authenticated;
revoke all on public.expenses from anon, authenticated;
revoke all on public.recurring_transactions from anon, authenticated;

grant select, insert, update on public.expense_categories to authenticated;
grant select, insert, update on public.expenses to authenticated;
grant select, insert, update on public.recurring_transactions to authenticated;
