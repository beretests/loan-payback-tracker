begin;

select plan(2);

select results_eq(
  $$
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = any(array[
        'expenses',
        'financial_accounts',
        'income_entries',
        'debt_charges',
        'loan_shares',
        'loans',
        'payment_events',
        'rate_periods',
        'recurring_transactions',
        'scheduled_payments'
      ])
  $$,
  array[10],
  'all required finance tables are realtime sources'
);

select results_eq(
  $$
    select count(*)::integer
    from pg_class
    where oid = any(array[
      'public.expenses'::regclass,
      'public.debt_charges'::regclass,
      'public.financial_accounts'::regclass,
      'public.income_entries'::regclass,
      'public.loans'::regclass,
      'public.payment_events'::regclass
    ])
      and relreplident = 'f'
  $$,
  array[6],
  'transactional tables expose full rows for secure update events'
);

select * from finish();
rollback;
