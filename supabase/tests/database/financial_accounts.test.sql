begin;

select plan(16);

select has_table('public', 'financial_accounts', 'financial accounts exist');
select has_column(
  'public',
  'expenses',
  'payment_account_id',
  'expenses can identify a named payment account'
);
select has_column(
  'public',
  'recurring_transactions',
  'payment_account_id',
  'recurring expenses can identify a named payment account'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.financial_accounts'::regclass
  $$,
  array[true],
  'financial accounts enforce RLS'
);

select policies_are(
  'public',
  'financial_accounts',
  array[
    'financial_accounts_insert_own',
    'financial_accounts_select_own',
    'financial_accounts_update_own'
  ],
  'financial account policies are user-scoped'
);

select table_privs_are(
  'public',
  'financial_accounts',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users cannot hard-delete financial accounts'
);

select col_is_fk(
  'public',
  'expenses',
  array['payment_account_id', 'user_id'],
  'expense payment accounts must belong to the same user'
);
select col_is_fk(
  'public',
  'recurring_transactions',
  array['payment_account_id', 'user_id'],
  'recurring payment accounts must belong to the same user'
);

insert into auth.users (id, email)
values
  ('41414141-4141-4141-8141-414141414141', 'accounts-one@example.com'),
  ('42424242-4242-4242-8242-424242424242', 'accounts-two@example.com');

insert into public.loans (
  id,
  user_id,
  name,
  principal,
  start_date,
  amort_months,
  day_count_basis,
  fixed_monthly_payment,
  debt_type,
  minimum_payment,
  due_day
)
values
  (
    '51515151-5151-4151-8151-515151515151',
    '41414141-4141-4141-8141-414141414141',
    'Everyday Visa',
    1200,
    '2026-09-01',
    12,
    365,
    110,
    'credit_card',
    40,
    15
  ),
  (
    '52525252-5252-4252-8252-525252525252',
    '42424242-4242-4242-8242-424242424242',
    'Other Visa',
    900,
    '2026-09-01',
    12,
    365,
    85,
    'credit_card',
    30,
    20
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '41414141-4141-4141-8141-414141414141',
  true
);

insert into public.financial_accounts (
  id,
  user_id,
  name,
  account_type,
  last_four,
  linked_loan_id
)
values (
  '61616161-6161-4161-8161-616161616161',
  '41414141-4141-4141-8141-414141414141',
  'Everyday Visa',
  'credit_card',
  '1234',
  '51515151-5151-4151-8151-515151515151'
);

select results_eq(
  'select count(*)::integer from public.financial_accounts',
  array[1],
  'a user can read their own named account'
);

select throws_ok(
  $$
    insert into public.financial_accounts (user_id, name, account_type)
    values (
      '42424242-4242-4242-8242-424242424242',
      'Hidden account',
      'bank_account'
    )
  $$,
  '42501',
  null,
  'a user cannot create an account for another user'
);

select throws_ok(
  $$
    insert into public.financial_accounts (
      user_id,
      name,
      account_type,
      linked_loan_id
    )
    values (
      '41414141-4141-4141-8141-414141414141',
      'Wrong owner Visa',
      'credit_card',
      '52525252-5252-4252-8252-525252525252'
    )
  $$,
  'P0001',
  'Linked debt must belong to the account owner',
  'an account cannot link another user debt'
);

select throws_ok(
  $$
    insert into public.financial_accounts (
      user_id,
      name,
      account_type,
      linked_loan_id
    )
    values (
      '41414141-4141-4141-8141-414141414141',
      'Mismatched account',
      'line_of_credit',
      '51515151-5151-4151-8151-515151515151'
    )
  $$,
  'P0001',
  'Account type must match the linked debt type',
  'the account type must match its linked debt'
);

insert into public.expense_categories (id, user_id, name)
values (
  '71717171-7171-4171-8171-717171717171',
  '41414141-4141-4141-8141-414141414141',
  'Groceries'
);

insert into public.expenses (
  user_id,
  category_id,
  description,
  amount,
  spent_on,
  payment_method,
  payment_account_id
)
values (
  '41414141-4141-4141-8141-414141414141',
  '71717171-7171-4171-8171-717171717171',
  'Weekly groceries',
  125,
  '2026-09-28',
  'credit_card',
  '61616161-6161-4161-8161-616161616161'
);

select results_eq(
  $$
    select count(*)::integer
    from public.expenses
    where payment_account_id =
      '61616161-6161-4161-8161-616161616161'
  $$,
  array[1],
  'an expense retains its named payment account'
);

select throws_ok(
  $$
    insert into public.expenses (
      user_id,
      category_id,
      description,
      amount,
      spent_on,
      payment_account_id
    )
    values (
      '41414141-4141-4141-8141-414141414141',
      '71717171-7171-4171-8171-717171717171',
      'Invalid account',
      10,
      '2026-09-28',
      '62626262-6262-4262-8262-626262626262'
    )
  $$,
  '23503',
  null,
  'an expense cannot reference an unavailable account'
);

insert into public.recurring_transactions (
  id,
  user_id,
  category_id,
  transaction_type,
  description,
  amount,
  day_of_month,
  payment_method,
  payment_account_id,
  starts_on,
  next_occurrence_on
)
values (
  '81818181-8181-4181-8181-818181818181',
  '41414141-4141-4141-8141-414141414141',
  '71717171-7171-4171-8171-717171717171',
  'expense',
  'Card subscription',
  20,
  28,
  'credit_card',
  '61616161-6161-4161-8161-616161616161',
  '2026-10-28',
  '2026-10-28'
);

select is(
  public.materialize_recurring_expenses('2026-10-28'),
  1,
  'a recurring account-backed expense is materialized'
);

select results_eq(
  $$
    select payment_account_id
    from public.expenses
    where recurring_transaction_id =
      '81818181-8181-4181-8181-818181818181'
  $$,
  array['61616161-6161-4161-8161-616161616161'::uuid],
  'materialized expenses retain the named payment account'
);

select * from finish();
rollback;
