-- Baseline for finance tables that predate this repository's tracked
-- migrations. This migration is intentionally earlier than the loan-sharing
-- migration, which adds foreign keys and RLS policies against these tables.

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(14, 2) not null check (principal > 0),
  start_date date not null,
  amort_months integer not null check (amort_months > 0),
  day_count_basis integer not null check (day_count_basis in (360, 365)),
  fixed_monthly_payment numeric(14, 2) not null
    check (fixed_monthly_payment > 0),
  prime_spread numeric not null default -0.0025,
  created_at timestamptz not null default now()
);

create index if not exists loans_user_created_idx
  on public.loans (user_id, created_at desc);

create table if not exists public.rate_periods (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  effective_date date not null,
  annual_rate numeric not null check (annual_rate >= 0),
  created_at timestamptz not null default now(),
  unique (loan_id, effective_date)
);

create index if not exists rate_periods_loan_date_idx
  on public.rate_periods (loan_id, effective_date);

create table if not exists public.scheduled_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  due_date date not null,
  expected_amount numeric(14, 2) not null check (expected_amount > 0),
  created_at timestamptz not null default now(),
  unique (loan_id, due_date)
);

create index if not exists scheduled_payments_loan_date_idx
  on public.scheduled_payments (loan_id, due_date);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  paid_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  kind text not null default 'manual'
    check (kind in ('manual', 'monthly', 'extra')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_loan_date_idx
  on public.payment_events (loan_id, paid_date);

grant select, insert, update, delete on public.loans to authenticated;
grant select, insert, update, delete on public.rate_periods to authenticated;
grant select, insert, update, delete on public.scheduled_payments to authenticated;
grant select, insert, update, delete on public.payment_events to authenticated;
