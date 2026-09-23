alter table public.loans
  add column debt_type text not null default 'personal_loan',
  add column minimum_payment numeric(14, 2),
  add column credit_limit numeric(14, 2),
  add column due_day smallint,
  add column archived_at timestamptz;

update public.loans
set
  minimum_payment = fixed_monthly_payment,
  due_day = extract(day from start_date)::smallint
where minimum_payment is null or due_day is null;

alter table public.loans
  alter column minimum_payment set not null,
  alter column minimum_payment set default 0,
  alter column due_day set not null,
  add constraint loans_debt_type_check
    check (
      debt_type in (
        'credit_card',
        'line_of_credit',
        'personal_loan',
        'mortgage',
        'informal_debt'
      )
    ),
  add constraint loans_minimum_payment_check
    check (minimum_payment >= 0),
  add constraint loans_credit_limit_check
    check (credit_limit is null or credit_limit > 0),
  add constraint loans_due_day_check
    check (due_day between 1 and 31);

create index loans_user_type_active_idx
  on public.loans (user_id, debt_type)
  where archived_at is null;
