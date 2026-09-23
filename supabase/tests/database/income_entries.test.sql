begin;

select plan(8);

select has_table('public', 'income_entries', 'income entries exist');
select has_column('public', 'income_entries', 'source', 'income source is stored');
select has_column(
  'public',
  'income_entries',
  'received_on',
  'income received date is stored'
);
select has_column(
  'public',
  'income_entries',
  'deleted_at',
  'income supports soft deletion'
);
select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.income_entries'::regclass
  $$,
  array[true],
  'income entries enforce RLS'
);
select policies_are(
  'public',
  'income_entries',
  array[
    'income_entries_insert_own',
    'income_entries_select_own',
    'income_entries_update_own'
  ],
  'income policies are user-scoped'
);
select table_privs_are(
  'public',
  'income_entries',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users cannot hard-delete income'
);
select col_is_fk(
  'public',
  'income_entries',
  'user_id',
  'income belongs to an authenticated user'
);

select * from finish();
rollback;
