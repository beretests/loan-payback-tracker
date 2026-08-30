-- RLS policies on loans and loan_shares previously queried each other,
-- causing PostgreSQL to recursively expand both sets of policies. These
-- security-definer helpers perform the relationship checks without invoking
-- RLS on the referenced tables.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_loan_owner(target_loan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.loans l
    where l.id = target_loan_id
      and l.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_loan_shared_with_current_user(target_loan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.loan_shares s
    where s.loan_id = target_loan_id
      and lower(s.invited_email) = lower((select auth.jwt() ->> 'email'))
  );
$$;

revoke all on function private.is_loan_owner(uuid) from public, anon;
revoke all on function private.is_loan_shared_with_current_user(uuid) from public, anon;
grant execute on function private.is_loan_owner(uuid) to authenticated;
grant execute on function private.is_loan_shared_with_current_user(uuid) to authenticated;

drop policy if exists "loan_shares_owner_select" on public.loan_shares;
drop policy if exists "loan_shares_owner_insert" on public.loan_shares;
drop policy if exists "loan_shares_owner_delete" on public.loan_shares;

create policy "loan_shares_owner_select"
  on public.loan_shares
  for select
  to authenticated
  using (private.is_loan_owner(loan_id));

create policy "loan_shares_owner_insert"
  on public.loan_shares
  for insert
  to authenticated
  with check (private.is_loan_owner(loan_id));

create policy "loan_shares_owner_delete"
  on public.loan_shares
  for delete
  to authenticated
  using (private.is_loan_owner(loan_id));

drop policy if exists "loans_shared_select" on public.loans;

create policy "loans_shared_select"
  on public.loans
  for select
  to authenticated
  using (private.is_loan_shared_with_current_user(id));

drop policy if exists "rate_periods_owner_select" on public.rate_periods;
drop policy if exists "rate_periods_shared_select" on public.rate_periods;
drop policy if exists "rate_periods_owner_insert" on public.rate_periods;
drop policy if exists "rate_periods_owner_update" on public.rate_periods;
drop policy if exists "rate_periods_owner_delete" on public.rate_periods;

create policy "rate_periods_owner_select"
  on public.rate_periods
  for select
  to authenticated
  using (private.is_loan_owner(loan_id));

create policy "rate_periods_shared_select"
  on public.rate_periods
  for select
  to authenticated
  using (private.is_loan_shared_with_current_user(loan_id));

create policy "rate_periods_owner_insert"
  on public.rate_periods
  for insert
  to authenticated
  with check (private.is_loan_owner(loan_id));

create policy "rate_periods_owner_update"
  on public.rate_periods
  for update
  to authenticated
  using (private.is_loan_owner(loan_id))
  with check (private.is_loan_owner(loan_id));

create policy "rate_periods_owner_delete"
  on public.rate_periods
  for delete
  to authenticated
  using (private.is_loan_owner(loan_id));

drop policy if exists "scheduled_owner_select" on public.scheduled_payments;
drop policy if exists "scheduled_shared_select" on public.scheduled_payments;
drop policy if exists "scheduled_owner_insert" on public.scheduled_payments;
drop policy if exists "scheduled_owner_update" on public.scheduled_payments;
drop policy if exists "scheduled_owner_delete" on public.scheduled_payments;

create policy "scheduled_owner_select"
  on public.scheduled_payments
  for select
  to authenticated
  using (private.is_loan_owner(loan_id));

create policy "scheduled_shared_select"
  on public.scheduled_payments
  for select
  to authenticated
  using (private.is_loan_shared_with_current_user(loan_id));

create policy "scheduled_owner_insert"
  on public.scheduled_payments
  for insert
  to authenticated
  with check (private.is_loan_owner(loan_id));

create policy "scheduled_owner_update"
  on public.scheduled_payments
  for update
  to authenticated
  using (private.is_loan_owner(loan_id))
  with check (private.is_loan_owner(loan_id));

create policy "scheduled_owner_delete"
  on public.scheduled_payments
  for delete
  to authenticated
  using (private.is_loan_owner(loan_id));

drop policy if exists "events_owner_select" on public.payment_events;
drop policy if exists "events_shared_select" on public.payment_events;
drop policy if exists "events_owner_insert" on public.payment_events;
drop policy if exists "events_owner_update" on public.payment_events;
drop policy if exists "events_owner_delete" on public.payment_events;

create policy "events_owner_select"
  on public.payment_events
  for select
  to authenticated
  using (private.is_loan_owner(loan_id));

create policy "events_shared_select"
  on public.payment_events
  for select
  to authenticated
  using (private.is_loan_shared_with_current_user(loan_id));

create policy "events_owner_insert"
  on public.payment_events
  for insert
  to authenticated
  with check (private.is_loan_owner(loan_id));

create policy "events_owner_update"
  on public.payment_events
  for update
  to authenticated
  using (private.is_loan_owner(loan_id))
  with check (private.is_loan_owner(loan_id));

create policy "events_owner_delete"
  on public.payment_events
  for delete
  to authenticated
  using (private.is_loan_owner(loan_id));
