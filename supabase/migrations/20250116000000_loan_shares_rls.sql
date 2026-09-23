create table if not exists public.loan_shares (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  invited_email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists loan_shares_unique
  on public.loan_shares (loan_id, invited_email);

create index if not exists loan_shares_email_idx
  on public.loan_shares (invited_email);

grant select, insert, update, delete on public.loan_shares to authenticated;

alter table public.loan_shares enable row level security;
alter table public.loans enable row level security;
alter table public.rate_periods enable row level security;
alter table public.scheduled_payments enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "loan_shares_owner_select" on public.loan_shares;
drop policy if exists "loan_shares_invited_select" on public.loan_shares;
drop policy if exists "loan_shares_owner_insert" on public.loan_shares;
drop policy if exists "loan_shares_owner_delete" on public.loan_shares;

create policy "loan_shares_owner_select"
  on public.loan_shares
  for select
  using (
    exists (
      select 1
      from public.loans l
      where l.id = loan_shares.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "loan_shares_invited_select"
  on public.loan_shares
  for select
  using (
    lower(loan_shares.invited_email) = lower(auth.jwt() ->> 'email')
  );

create policy "loan_shares_owner_insert"
  on public.loan_shares
  for insert
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = loan_shares.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "loan_shares_owner_delete"
  on public.loan_shares
  for delete
  using (
    exists (
      select 1
      from public.loans l
      where l.id = loan_shares.loan_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "loans_owner_select" on public.loans;
drop policy if exists "loans_shared_select" on public.loans;
drop policy if exists "loans_owner_insert" on public.loans;
drop policy if exists "loans_owner_update" on public.loans;
drop policy if exists "loans_owner_delete" on public.loans;

create policy "loans_owner_select"
  on public.loans
  for select
  using (user_id = auth.uid());

create policy "loans_shared_select"
  on public.loans
  for select
  using (
    exists (
      select 1
      from public.loan_shares s
      where s.loan_id = loans.id
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "loans_owner_insert"
  on public.loans
  for insert
  with check (user_id = auth.uid());

create policy "loans_owner_update"
  on public.loans
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "loans_owner_delete"
  on public.loans
  for delete
  using (user_id = auth.uid());

drop policy if exists "rate_periods_owner_select" on public.rate_periods;
drop policy if exists "rate_periods_shared_select" on public.rate_periods;
drop policy if exists "rate_periods_owner_insert" on public.rate_periods;
drop policy if exists "rate_periods_owner_update" on public.rate_periods;
drop policy if exists "rate_periods_owner_delete" on public.rate_periods;

create policy "rate_periods_owner_select"
  on public.rate_periods
  for select
  using (
    exists (
      select 1
      from public.loans l
      where l.id = rate_periods.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "rate_periods_shared_select"
  on public.rate_periods
  for select
  using (
    exists (
      select 1
      from public.loan_shares s
      where s.loan_id = rate_periods.loan_id
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "rate_periods_owner_insert"
  on public.rate_periods
  for insert
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = rate_periods.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "rate_periods_owner_update"
  on public.rate_periods
  for update
  using (
    exists (
      select 1
      from public.loans l
      where l.id = rate_periods.loan_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = rate_periods.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "rate_periods_owner_delete"
  on public.rate_periods
  for delete
  using (
    exists (
      select 1
      from public.loans l
      where l.id = rate_periods.loan_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "scheduled_owner_select" on public.scheduled_payments;
drop policy if exists "scheduled_shared_select" on public.scheduled_payments;
drop policy if exists "scheduled_owner_insert" on public.scheduled_payments;
drop policy if exists "scheduled_owner_update" on public.scheduled_payments;
drop policy if exists "scheduled_owner_delete" on public.scheduled_payments;

create policy "scheduled_owner_select"
  on public.scheduled_payments
  for select
  using (
    exists (
      select 1
      from public.loans l
      where l.id = scheduled_payments.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "scheduled_shared_select"
  on public.scheduled_payments
  for select
  using (
    exists (
      select 1
      from public.loan_shares s
      where s.loan_id = scheduled_payments.loan_id
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "scheduled_owner_insert"
  on public.scheduled_payments
  for insert
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = scheduled_payments.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "scheduled_owner_update"
  on public.scheduled_payments
  for update
  using (
    exists (
      select 1
      from public.loans l
      where l.id = scheduled_payments.loan_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = scheduled_payments.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "scheduled_owner_delete"
  on public.scheduled_payments
  for delete
  using (
    exists (
      select 1
      from public.loans l
      where l.id = scheduled_payments.loan_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "events_owner_select" on public.payment_events;
drop policy if exists "events_shared_select" on public.payment_events;
drop policy if exists "events_owner_insert" on public.payment_events;
drop policy if exists "events_owner_update" on public.payment_events;
drop policy if exists "events_owner_delete" on public.payment_events;

create policy "events_owner_select"
  on public.payment_events
  for select
  using (
    exists (
      select 1
      from public.loans l
      where l.id = payment_events.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "events_shared_select"
  on public.payment_events
  for select
  using (
    exists (
      select 1
      from public.loan_shares s
      where s.loan_id = payment_events.loan_id
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "events_owner_insert"
  on public.payment_events
  for insert
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = payment_events.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "events_owner_update"
  on public.payment_events
  for update
  using (
    exists (
      select 1
      from public.loans l
      where l.id = payment_events.loan_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.loans l
      where l.id = payment_events.loan_id
        and l.user_id = auth.uid()
    )
  );

create policy "events_owner_delete"
  on public.payment_events
  for delete
  using (
    exists (
      select 1
      from public.loans l
      where l.id = payment_events.loan_id
        and l.user_id = auth.uid()
    )
  );
