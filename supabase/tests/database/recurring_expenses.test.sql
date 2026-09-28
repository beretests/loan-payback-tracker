begin;

select plan(16);

select has_column(
  'public',
  'expenses',
  'recurring_transaction_id',
  'generated expenses retain their recurrence source'
);
select has_function(
  'public',
  'materialize_recurring_expenses',
  array['date'],
  'recurring materializer exists'
);
select has_function(
  'private',
  'next_yearly_occurrence',
  array['date', 'integer', 'integer'],
  'yearly occurrence calculator exists'
);
select is(
  private.next_monthly_occurrence('2026-01-31', 31),
  '2026-02-28'::date,
  'monthly dates clamp to the last day of a short month'
);
select is(
  private.next_yearly_occurrence('2028-02-29', 2, 29),
  '2029-02-28'::date,
  'a leap-day recurrence clamps safely in a non-leap year'
);
select is(
  private.next_yearly_occurrence('2031-02-28', 2, 29),
  '2032-02-29'::date,
  'a leap-day recurrence returns to February 29 in a leap year'
);

insert into auth.users (id, email)
values ('33333333-3333-4333-8333-333333333333', 'recurring@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

insert into public.expense_categories (id, user_id, name)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  'Subscriptions'
);

insert into public.recurring_transactions (
  id,
  user_id,
  category_id,
  transaction_type,
  description,
  amount,
  day_of_month,
  starts_on,
  next_occurrence_on,
  payment_method
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '33333333-3333-4333-8333-333333333333',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'expense',
  'Streaming service',
  15,
  31,
  '2026-01-31',
  '2026-01-31',
  'credit_card'
);

select is(
  public.materialize_recurring_expenses('2026-03-31'),
  3,
  'materializer creates every due monthly expense'
);
select results_eq(
  $$
    select spent_on
    from public.expenses
    where recurring_transaction_id =
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    order by spent_on
  $$,
  array['2026-01-31'::date, '2026-02-28'::date, '2026-03-31'::date],
  'generated dates preserve the requested day when possible'
);
select is(
  public.materialize_recurring_expenses('2026-03-31'),
  0,
  're-running materialization is idempotent'
);
select results_eq(
  $$
    select next_occurrence_on
    from public.recurring_transactions
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  $$,
  array['2026-04-30'::date],
  'the definition advances to its next due date'
);

select results_eq(
  $$
    select count(*)::integer
    from public.expenses
    where recurring_transaction_id =
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  $$,
  array[3],
  'no duplicate generated expenses are recorded'
);

update public.recurring_transactions
set is_active = false
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select throws_ok(
  $$
    insert into public.recurring_transactions (
      user_id, category_id, transaction_type, description, amount, cadence,
      day_of_month, starts_on, next_occurrence_on
    ) values (
      '33333333-3333-4333-8333-333333333333',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'expense', 'Unsupported schedule', 10, 'weekly', 1,
      '2028-01-01', '2028-01-01'
    )
  $$,
  '23514',
  null,
  'unsupported recurring cadences remain rejected'
);

insert into public.recurring_transactions (
  id,
  user_id,
  category_id,
  transaction_type,
  description,
  amount,
  cadence,
  day_of_month,
  starts_on,
  next_occurrence_on,
  payment_method
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '33333333-3333-4333-8333-333333333333',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'expense',
  'Annual renewal',
  120,
  'yearly',
  29,
  '2028-02-29',
  '2028-02-29',
  'credit_card'
);

select is(
  public.materialize_recurring_expenses('2032-02-29'),
  5,
  'materializer creates one expense per due year'
);
select results_eq(
  $$
    select spent_on
    from public.expenses
    where recurring_transaction_id =
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    order by spent_on
  $$,
  array[
    '2028-02-29'::date,
    '2029-02-28'::date,
    '2030-02-28'::date,
    '2031-02-28'::date,
    '2032-02-29'::date
  ],
  'yearly dates retain their original calendar intent'
);
select results_eq(
  $$
    select next_occurrence_on
    from public.recurring_transactions
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  $$,
  array['2033-02-28'::date],
  'the yearly definition advances to its next annual due date'
);
select is(
  public.materialize_recurring_expenses('2032-02-29'),
  0,
  'yearly materialization is idempotent'
);

select * from finish();
rollback;
