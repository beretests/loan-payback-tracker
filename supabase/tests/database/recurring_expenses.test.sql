begin;

select plan(8);

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
select is(
  private.next_monthly_occurrence('2026-01-31', 31),
  '2026-02-28'::date,
  'monthly dates clamp to the last day of a short month'
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

select * from finish();
rollback;
