alter table public.loans
  add constraint loans_id_user_id_unique unique (id, user_id);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  account_type text not null
    check (
      account_type in (
        'cash',
        'bank_account',
        'debit_card',
        'credit_card',
        'line_of_credit',
        'other'
      )
    ),
  institution text check (
    institution is null or length(trim(institution)) between 1 and 100
  ),
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  linked_loan_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint financial_accounts_linked_loan_owner_fk
    foreign key (linked_loan_id, user_id)
    references public.loans (id, user_id),
  constraint financial_accounts_debt_link_type_check
    check (
      linked_loan_id is null
      or account_type in ('credit_card', 'line_of_credit')
    )
);

create unique index financial_accounts_user_name_active_idx
  on public.financial_accounts (user_id, lower(name))
  where deleted_at is null;

create index financial_accounts_user_type_active_idx
  on public.financial_accounts (user_id, account_type)
  where deleted_at is null;

create or replace function private.validate_financial_account_debt_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_debt_type text;
begin
  if new.linked_loan_id is null then
    return new;
  end if;

  select debt_type
  into linked_debt_type
  from public.loans
  where id = new.linked_loan_id
    and user_id = new.user_id;

  if linked_debt_type is null then
    raise exception 'Linked debt must belong to the account owner';
  end if;

  if linked_debt_type <> new.account_type then
    raise exception 'Account type must match the linked debt type';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_financial_account_debt_link()
  from public, anon, authenticated;

create trigger financial_accounts_validate_debt_link
before insert or update of user_id, account_type, linked_loan_id
on public.financial_accounts
for each row execute function private.validate_financial_account_debt_link();

create trigger financial_accounts_set_updated_at
before update on public.financial_accounts
for each row execute function private.set_updated_at();

alter table public.expenses
  drop constraint expenses_payment_method_check,
  add constraint expenses_payment_method_check
    check (
      payment_method in (
        'cash',
        'debit_card',
        'credit_card',
        'line_of_credit',
        'bank_transfer',
        'other'
      )
    ),
  add column payment_account_id uuid,
  add constraint expenses_payment_account_owner_fk
    foreign key (payment_account_id, user_id)
    references public.financial_accounts (id, user_id);

alter table public.recurring_transactions
  drop constraint recurring_transactions_payment_method_check,
  add constraint recurring_transactions_payment_method_check
    check (
      payment_method is null
      or payment_method in (
        'cash',
        'debit_card',
        'credit_card',
        'line_of_credit',
        'bank_transfer',
        'other'
      )
    ),
  add column payment_account_id uuid,
  add constraint recurring_payment_account_owner_fk
    foreign key (payment_account_id, user_id)
    references public.financial_accounts (id, user_id);

create index expenses_user_payment_account_idx
  on public.expenses (user_id, payment_account_id, spent_on desc)
  where deleted_at is null and payment_account_id is not null;

create or replace function public.materialize_recurring_expenses(
  target_date date default current_date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  definition record;
  occurrence date;
  inserted_rows integer;
  created_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;

  for definition in
    select *
    from public.recurring_transactions
    where user_id = (select auth.uid())
      and transaction_type = 'expense'
      and is_active
      and deleted_at is null
      and next_occurrence_on <= target_date
    order by next_occurrence_on, id
  loop
    occurrence := definition.next_occurrence_on;

    while occurrence <= target_date
      and (definition.ends_on is null or occurrence <= definition.ends_on)
    loop
      insert into public.expenses (
        user_id,
        category_id,
        description,
        amount,
        spent_on,
        payment_method,
        payment_account_id,
        expense_type,
        recurring_transaction_id
      )
      values (
        definition.user_id,
        definition.category_id,
        definition.description,
        definition.amount,
        occurrence,
        coalesce(definition.payment_method, 'other'),
        definition.payment_account_id,
        'ordinary',
        definition.id
      )
      on conflict (recurring_transaction_id, spent_on)
        where recurring_transaction_id is not null
      do nothing;

      get diagnostics inserted_rows = row_count;
      created_count := created_count + inserted_rows;
      occurrence := private.next_monthly_occurrence(
        occurrence,
        definition.day_of_month
      );
    end loop;

    update public.recurring_transactions
    set
      next_occurrence_on = occurrence,
      is_active = case
        when definition.ends_on is not null
          and occurrence > definition.ends_on
        then false
        else is_active
      end
    where id = definition.id;
  end loop;

  return created_count;
end;
$$;

alter table public.financial_accounts enable row level security;

create policy "financial_accounts_select_own"
  on public.financial_accounts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "financial_accounts_insert_own"
  on public.financial_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "financial_accounts_update_own"
  on public.financial_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.financial_accounts from anon, authenticated;
grant select, insert, update on public.financial_accounts to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'financial_accounts'
  ) then
    alter publication supabase_realtime add table public.financial_accounts;
  end if;
end;
$$;

alter table public.financial_accounts replica identity full;
