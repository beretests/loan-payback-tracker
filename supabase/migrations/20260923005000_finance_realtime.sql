do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'loans',
    'loan_shares',
    'rate_periods',
    'scheduled_payments',
    'payment_events',
    'expenses',
    'income_entries',
    'recurring_transactions'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;

alter table public.loans replica identity full;
alter table public.loan_shares replica identity full;
alter table public.rate_periods replica identity full;
alter table public.scheduled_payments replica identity full;
alter table public.payment_events replica identity full;
alter table public.expenses replica identity full;
alter table public.income_entries replica identity full;
alter table public.recurring_transactions replica identity full;
