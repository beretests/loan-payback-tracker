begin;

select plan(18);

select has_table('public', 'expense_categories', 'expense categories exist');
select has_table('public', 'expenses', 'expenses exist');
select has_table(
  'public',
  'recurring_transactions',
  'recurring transactions exist'
);
select has_column('public', 'expenses', 'expense_type', 'expense type is explicit');
select has_column('public', 'expenses', 'deleted_at', 'expenses support soft deletion');
select has_column(
  'public',
  'recurring_transactions',
  'next_occurrence_on',
  'recurring definitions track their next occurrence'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.expense_categories'::regclass
  $$,
  array[true],
  'expense categories enforce RLS'
);
select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.expenses'::regclass
  $$,
  array[true],
  'expenses enforce RLS'
);
select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.recurring_transactions'::regclass
  $$,
  array[true],
  'recurring transactions enforce RLS'
);

select policies_are(
  'public',
  'expense_categories',
  array[
    'expense_categories_insert_own',
    'expense_categories_select_own',
    'expense_categories_update_own'
  ],
  'expense category policies are user-scoped'
);
select policies_are(
  'public',
  'expenses',
  array[
    'expenses_insert_own',
    'expenses_select_own',
    'expenses_update_own'
  ],
  'expense policies are user-scoped'
);
select policies_are(
  'public',
  'recurring_transactions',
  array[
    'recurring_transactions_insert_own',
    'recurring_transactions_select_own',
    'recurring_transactions_update_own'
  ],
  'recurring transaction policies are user-scoped'
);

select col_is_fk(
  'public',
  'expenses',
  array['category_id', 'user_id'],
  'expense categories must belong to the same user'
);
select col_is_fk(
  'public',
  'recurring_transactions',
  array['category_id', 'user_id'],
  'recurring categories must belong to the same user'
);

select table_privs_are(
  'public',
  'expenses',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users cannot hard-delete expenses'
);
select table_privs_are(
  'public',
  'expense_categories',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users cannot hard-delete categories'
);
select table_privs_are(
  'public',
  'recurring_transactions',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users cannot hard-delete recurring definitions'
);
select has_function(
  'private',
  'set_updated_at',
  array[]::text[],
  'shared updated-at trigger function exists'
);

select * from finish();
rollback;
