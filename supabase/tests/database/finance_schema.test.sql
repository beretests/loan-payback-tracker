begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_table('public', 'loans', 'loans table exists');
select has_table('public', 'rate_periods', 'rate periods table exists');
select has_table('public', 'scheduled_payments', 'scheduled payments table exists');
select has_table('public', 'payment_events', 'payment events table exists');
select has_table('public', 'loan_shares', 'loan shares table exists');

select has_column('public', 'loans', 'user_id', 'loans belong to a user');
select has_column('public', 'payment_events', 'kind', 'payments distinguish their kind');

select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.loans'::regclass
  $$,
  array[true],
  'loans has row-level security enabled'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.loan_shares'::regclass
  $$,
  array[true],
  'loan shares has row-level security enabled'
);

select has_function(
  'private',
  'is_loan_owner',
  array['uuid'],
  'owner helper exists outside the public API schema'
);

select has_function(
  'private',
  'is_loan_shared_with_current_user',
  array['uuid'],
  'shared-loan helper exists outside the public API schema'
);

select policies_are(
  'public',
  'loans',
  array[
    'loans_owner_delete',
    'loans_owner_insert',
    'loans_owner_select',
    'loans_owner_update',
    'loans_shared_select'
  ],
  'loans exposes only the expected policies'
);

select policies_are(
  'public',
  'loan_shares',
  array[
    'loan_shares_invited_select',
    'loan_shares_owner_delete',
    'loan_shares_owner_insert',
    'loan_shares_owner_select'
  ],
  'loan shares exposes only the expected policies'
);

select * from finish();
rollback;
