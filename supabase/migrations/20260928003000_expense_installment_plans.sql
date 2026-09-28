create table public.expense_installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  description text not null check (length(trim(description)) between 1 and 160),
  total_amount numeric(14, 2) not null check (total_amount > 0),
  installment_count integer not null check (installment_count between 2 and 240),
  first_due_on date not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  payment_method text not null
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
  payment_account_id uuid,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint installment_plan_category_owner_fk
    foreign key (category_id, user_id)
    references public.expense_categories (id, user_id),
  constraint installment_plan_account_owner_fk
    foreign key (payment_account_id, user_id)
    references public.financial_accounts (id, user_id)
);

create table public.expense_installments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null check (ordinal > 0),
  due_on date not null,
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'paid', 'cancelled')),
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, ordinal),
  unique (id, user_id),
  constraint expense_installments_plan_owner_fk
    foreign key (plan_id, user_id)
    references public.expense_installment_plans (id, user_id)
    on delete cascade,
  constraint expense_installments_paid_check
    check (
      (status = 'paid' and paid_on is not null)
      or (status <> 'paid' and paid_on is null)
    )
);

alter table public.expenses
  add column installment_id uuid,
  add constraint expenses_installment_owner_fk
    foreign key (installment_id, user_id)
    references public.expense_installments (id, user_id);

create unique index expenses_installment_active_idx
  on public.expenses (installment_id)
  where installment_id is not null and deleted_at is null;
create index expense_installment_plans_user_status_idx
  on public.expense_installment_plans (user_id, status, first_due_on)
  where deleted_at is null;
create index expense_installments_user_due_idx
  on public.expense_installments (user_id, due_on, status);

create trigger expense_installment_plans_set_updated_at
before update on public.expense_installment_plans
for each row execute function private.set_updated_at();
create trigger expense_installments_set_updated_at
before update on public.expense_installments
for each row execute function private.set_updated_at();

alter table public.expense_installment_plans enable row level security;
alter table public.expense_installments enable row level security;

create policy "installment_plans_select_own"
  on public.expense_installment_plans for select to authenticated
  using (user_id = (select auth.uid()));
create policy "installment_plans_insert_own"
  on public.expense_installment_plans for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "installment_plans_update_own"
  on public.expense_installment_plans for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "installments_select_own"
  on public.expense_installments for select to authenticated
  using (user_id = (select auth.uid()));
create policy "installments_insert_own"
  on public.expense_installments for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "installments_update_own"
  on public.expense_installments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.expense_installment_plans from anon, authenticated;
revoke all on public.expense_installments from anon, authenticated;
grant select on public.expense_installment_plans to authenticated;
grant select on public.expense_installments to authenticated;

create or replace function private.protect_installment_expense()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'postgres'
    and (
      (tg_op = 'INSERT' and new.installment_id is not null)
      or (tg_op = 'UPDATE' and old.installment_id is not null)
      or (tg_op = 'UPDATE' and new.installment_id is not null)
    ) then
    raise exception 'Installment expenses must be managed through the installment plan';
  end if;
  return new;
end;
$$;

create trigger expenses_protect_installment
before insert or update on public.expenses
for each row execute function private.protect_installment_expense();

create or replace function public.create_expense_installment_plan(
  p_description text,
  p_total_amount numeric,
  p_installment_count integer,
  p_first_due_on date,
  p_frequency text,
  p_category_id uuid,
  p_payment_method text,
  p_payment_account_id uuid,
  p_notes text,
  p_schedule jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := (select auth.uid());
  created_plan_id uuid;
  schedule_total numeric;
begin
  if owner_id is null then raise exception 'Authentication is required'; end if;
  if jsonb_typeof(p_schedule) <> 'array'
    or jsonb_array_length(p_schedule) <> p_installment_count then
    raise exception 'Installment schedule does not match installment count';
  end if;
  select sum((item ->> 'amount')::numeric)
  into schedule_total
  from jsonb_array_elements(p_schedule) item;
  if schedule_total <> p_total_amount then
    raise exception 'Installment amounts must equal the plan total';
  end if;

  insert into public.expense_installment_plans (
    user_id, category_id, description, total_amount, installment_count,
    first_due_on, frequency, payment_method, payment_account_id, notes
  )
  values (
    owner_id, p_category_id, trim(p_description), p_total_amount,
    p_installment_count, p_first_due_on, p_frequency, p_payment_method,
    p_payment_account_id, nullif(trim(p_notes), '')
  )
  returning id into created_plan_id;

  insert into public.expense_installments (
    plan_id, user_id, ordinal, due_on, amount
  )
  select
    created_plan_id,
    owner_id,
    (item ->> 'ordinal')::integer,
    (item ->> 'dueOn')::date,
    (item ->> 'amount')::numeric
  from jsonb_array_elements(p_schedule) item;

  return created_plan_id;
end;
$$;

create or replace function public.pay_expense_installment(
  p_installment_id uuid,
  p_paid_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data record;
  expense_id uuid;
begin
  select i.*, p.category_id, p.description, p.payment_method,
    p.payment_account_id, p.notes
  into row_data
  from public.expense_installments i
  join public.expense_installment_plans p on p.id = i.plan_id
  where i.id = p_installment_id
    and i.user_id = (select auth.uid())
  for update of i;
  if not found then raise exception 'Installment was not found'; end if;
  if row_data.status <> 'scheduled' then
    raise exception 'Only a scheduled installment can be paid';
  end if;

  insert into public.expenses (
    user_id, category_id, description, amount, spent_on, payment_method,
    payment_account_id, expense_type, notes, installment_id
  )
  values (
    row_data.user_id, row_data.category_id, row_data.description,
    row_data.amount, p_paid_on, row_data.payment_method,
    row_data.payment_account_id, 'ordinary',
    concat('Installment ', row_data.ordinal, ' · ', coalesce(row_data.notes, '')),
    row_data.id
  )
  returning id into expense_id;

  update public.expense_installments
  set status = 'paid', paid_on = p_paid_on
  where id = row_data.id;

  if not exists (
    select 1 from public.expense_installments
    where plan_id = row_data.plan_id and status = 'scheduled'
  ) then
    update public.expense_installment_plans
    set status = 'completed'
    where id = row_data.plan_id;
  end if;
  return expense_id;
end;
$$;

create or replace function public.undo_expense_installment_payment(
  p_installment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.expense_installments i
    join public.expense_installment_plans p on p.id = i.plan_id
    where i.id = p_installment_id
      and i.user_id = (select auth.uid())
      and i.status = 'paid'
  ) then
    raise exception 'Paid installment was not found';
  end if;
  update public.expenses
  set deleted_at = now()
  where installment_id = p_installment_id
    and user_id = (select auth.uid())
    and deleted_at is null;
  update public.expense_installments
  set status = case
      when exists (
        select 1 from public.expense_installment_plans p
        where p.id = expense_installments.plan_id
          and p.status = 'cancelled'
      ) then 'cancelled'
      else 'scheduled'
    end,
    paid_on = null
  where id = p_installment_id;
  update public.expense_installment_plans
  set status = 'active'
  where id = (
    select plan_id from public.expense_installments
    where id = p_installment_id
  ) and status <> 'cancelled';
end;
$$;

create or replace function public.cancel_expense_installment_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.expense_installment_plans
  set status = 'cancelled'
  where id = p_plan_id
    and user_id = (select auth.uid())
    and status = 'active';
  if not found then raise exception 'Installment plan was not found'; end if;
  update public.expense_installments
  set status = 'cancelled'
  where plan_id = p_plan_id and status = 'scheduled';
end;
$$;

revoke all on function public.create_expense_installment_plan(
  text, numeric, integer, date, text, uuid, text, uuid, text, jsonb
) from public, anon;
grant execute on function public.create_expense_installment_plan(
  text, numeric, integer, date, text, uuid, text, uuid, text, jsonb
) to authenticated;
revoke all on function public.pay_expense_installment(uuid, date)
  from public, anon;
grant execute on function public.pay_expense_installment(uuid, date)
  to authenticated;
revoke all on function public.undo_expense_installment_payment(uuid)
  from public, anon;
grant execute on function public.undo_expense_installment_payment(uuid)
  to authenticated;
revoke all on function public.cancel_expense_installment_plan(uuid)
  from public, anon;
grant execute on function public.cancel_expense_installment_plan(uuid)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'expense_installment_plans'
  ) then
    alter publication supabase_realtime
      add table public.expense_installment_plans;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'expense_installments'
  ) then
    alter publication supabase_realtime
      add table public.expense_installments;
  end if;
end;
$$;

alter table public.expense_installment_plans replica identity full;
alter table public.expense_installments replica identity full;
