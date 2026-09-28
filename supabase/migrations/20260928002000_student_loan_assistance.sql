alter table public.loans
  drop constraint loans_debt_type_check,
  add constraint loans_debt_type_check
    check (
      debt_type in (
        'credit_card',
        'line_of_credit',
        'personal_loan',
        'student_loan',
        'mortgage',
        'informal_debt'
      )
    );

create table public.debt_assistance_periods (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  assistance_type text not null
    check (
      assistance_type in (
        'interest_free',
        'reduced_payment',
        'payment_pause'
      )
    ),
  starts_on date not null,
  ends_on date,
  required_payment numeric(14, 2),
  note text,
  recorded_by uuid not null default auth.uid()
    references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint debt_assistance_dates_check
    check (ends_on is null or ends_on >= starts_on),
  constraint debt_assistance_payment_check
    check (
      (
        assistance_type = 'reduced_payment'
        and required_payment is not null
        and required_payment >= 0
      )
      or (
        assistance_type <> 'reduced_payment'
        and required_payment is null
      )
    )
);

create index debt_assistance_periods_loan_dates_idx
  on public.debt_assistance_periods (loan_id, starts_on, ends_on);

create or replace function private.validate_student_loan_assistance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  debt_type_value text;
  minimum_payment_value numeric;
begin
  select debt_type, minimum_payment
  into debt_type_value, minimum_payment_value
  from public.loans
  where id = new.loan_id;

  if debt_type_value is distinct from 'student_loan' then
    raise exception 'Repayment assistance can only be added to a student loan';
  end if;
  if new.assistance_type = 'reduced_payment'
    and new.required_payment > minimum_payment_value then
    raise exception 'Reduced payment cannot exceed the regular minimum';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_student_loan_assistance()
  from public, anon, authenticated;

create trigger validate_student_loan_assistance
before insert or update on public.debt_assistance_periods
for each row execute function private.validate_student_loan_assistance();

alter table public.debt_assistance_periods enable row level security;

create policy "debt_assistance_owner_select"
  on public.debt_assistance_periods for select to authenticated
  using (private.is_loan_owner(loan_id));
create policy "debt_assistance_shared_select"
  on public.debt_assistance_periods for select to authenticated
  using (private.is_loan_shared_with_current_user(loan_id));
create policy "debt_assistance_owner_insert"
  on public.debt_assistance_periods for insert to authenticated
  with check (
    private.is_loan_owner(loan_id)
    and recorded_by = (select auth.uid())
  );
create policy "debt_assistance_owner_update"
  on public.debt_assistance_periods for update to authenticated
  using (private.is_loan_owner(loan_id))
  with check (
    private.is_loan_owner(loan_id)
    and recorded_by = (select auth.uid())
  );
create policy "debt_assistance_owner_delete"
  on public.debt_assistance_periods for delete to authenticated
  using (private.is_loan_owner(loan_id));

revoke all on public.debt_assistance_periods from anon, authenticated;
grant select, insert, update, delete
  on public.debt_assistance_periods to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debt_assistance_periods'
  ) then
    alter publication supabase_realtime
      add table public.debt_assistance_periods;
  end if;
end;
$$;

alter table public.debt_assistance_periods replica identity full;
