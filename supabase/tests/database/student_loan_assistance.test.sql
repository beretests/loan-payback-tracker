begin;

select plan(20);

select has_table(
  'public',
  'debt_assistance_periods',
  'student-loan assistance periods exist'
);
select has_column(
  'public',
  'debt_assistance_periods',
  'assistance_type',
  'assistance periods identify their rule'
);
select has_column(
  'public',
  'debt_assistance_periods',
  'required_payment',
  'reduced-payment periods retain their required amount'
);
select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.debt_assistance_periods'::regclass
  $$,
  array[true],
  'assistance periods enforce RLS'
);
select policies_are(
  'public',
  'debt_assistance_periods',
  array[
    'debt_assistance_owner_delete',
    'debt_assistance_owner_insert',
    'debt_assistance_owner_select',
    'debt_assistance_owner_update',
    'debt_assistance_shared_select'
  ],
  'assistance periods use owner-write and participant-read policies'
);

insert into auth.users (id, email)
values
  ('a1111111-1111-4111-8111-111111111111', 'student-owner@example.com'),
  ('a2222222-2222-4222-8222-222222222222', 'student-viewer@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1111111-1111-4111-8111-111111111111',
  true
);

select lives_ok(
  $$
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
      due_day,
      rate_type,
      prime_spread
    )
    values (
      'a3333333-3333-4333-8333-333333333333',
      'a1111111-1111-4111-8111-111111111111',
      'Federal student loan',
      12000,
      '2026-09-01',
      120,
      365,
      125,
      'student_loan',
      125,
      15,
      'interest_free',
      null
    )
  $$,
  'student loan is an explicit debt type'
);

select lives_ok(
  $$
    insert into public.debt_assistance_periods (
      id,
      loan_id,
      assistance_type,
      starts_on,
      ends_on,
      note
    )
    values (
      'a4444444-4444-4444-8444-444444444444',
      'a3333333-3333-4333-8333-333333333333',
      'interest_free',
      '2026-09-01',
      '2027-08-31',
      'Interest relief'
    )
  $$,
  'an owner can record an interest-free period'
);

select results_eq(
  $$
    select recorded_by
    from public.debt_assistance_periods
    where id = 'a4444444-4444-4444-8444-444444444444'
  $$,
  array['a1111111-1111-4111-8111-111111111111'::uuid],
  'assistance periods retain the recording owner'
);

select lives_ok(
  $$
    insert into public.debt_assistance_periods (
      id,
      loan_id,
      assistance_type,
      starts_on,
      ends_on,
      required_payment
    )
    values (
      'a5555555-5555-4555-8555-555555555555',
      'a3333333-3333-4333-8333-333333333333',
      'reduced_payment',
      '2027-09-01',
      '2028-02-29',
      50
    )
  $$,
  'an owner can record a reduced-payment period'
);

select throws_ok(
  $$
    insert into public.debt_assistance_periods (
      loan_id,
      assistance_type,
      starts_on,
      required_payment
    )
    values (
      'a3333333-3333-4333-8333-333333333333',
      'reduced_payment',
      '2028-03-01',
      150
    )
  $$,
  'P0001',
  'Reduced payment cannot exceed the regular minimum',
  'a reduced payment cannot exceed the regular minimum'
);

select throws_ok(
  $$
    insert into public.debt_assistance_periods (
      loan_id,
      assistance_type,
      starts_on,
      required_payment
    )
    values (
      'a3333333-3333-4333-8333-333333333333',
      'payment_pause',
      '2028-03-01',
      25
    )
  $$,
  '23514',
  null,
  'a payment pause cannot carry a reduced-payment amount'
);

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
  due_day,
  rate_type,
  prime_spread
)
values (
  'a6666666-6666-4666-8666-666666666666',
  'a1111111-1111-4111-8111-111111111111',
  'Personal loan',
  1000,
  '2026-09-01',
  12,
  365,
  90,
  'personal_loan',
  90,
  1,
  'fixed',
  null
);

select throws_ok(
  $$
    insert into public.debt_assistance_periods (
      loan_id,
      assistance_type,
      starts_on
    )
    values (
      'a6666666-6666-4666-8666-666666666666',
      'interest_free',
      '2026-09-01'
    )
  $$,
  'P0001',
  'Repayment assistance can only be added to a student loan',
  'assistance cannot be attached to another debt type'
);

select lives_ok(
  $$
    update public.debt_assistance_periods
    set note = 'Approved interest relief'
    where id = 'a4444444-4444-4444-8444-444444444444'
  $$,
  'an owner can update an assistance period'
);

insert into public.loan_shares (loan_id, invited_email)
values (
  'a3333333-3333-4333-8333-333333333333',
  'student-viewer@example.com'
);

select set_config(
  'request.jwt.claim.sub',
  'a2222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2222222-2222-4222-8222-222222222222","email":"student-viewer@example.com"}',
  true
);

select results_eq(
  'select count(*)::integer from public.debt_assistance_periods',
  array[2],
  'a shared participant can read assistance periods'
);

select throws_ok(
  $$
    insert into public.debt_assistance_periods (
      loan_id,
      assistance_type,
      starts_on
    )
    values (
      'a3333333-3333-4333-8333-333333333333',
      'payment_pause',
      '2028-03-01'
    )
  $$,
  '42501',
  null,
  'a shared participant cannot add assistance'
);

select results_eq(
  $$
    update public.debt_assistance_periods
    set note = 'Not allowed'
    where id = 'a4444444-4444-4444-8444-444444444444'
    returning note
  $$,
  array[]::text[],
  'a shared participant cannot change assistance'
);

select set_config(
  'request.jwt.claim.sub',
  'a1111111-1111-4111-8111-111111111111',
  true
);

select lives_ok(
  $$
    delete from public.debt_assistance_periods
    where id = 'a5555555-5555-4555-8555-555555555555'
  $$,
  'an owner can remove an incorrectly entered period'
);

select results_eq(
  $$
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debt_assistance_periods'
  $$,
  array[1],
  'assistance periods are published for Realtime'
);

select results_eq(
  $$
    select relreplident
    from pg_class
    where oid = 'public.debt_assistance_periods'::regclass
  $$,
  array['f'::"char"],
  'assistance changes expose full rows to Realtime'
);

select throws_ok(
  $$
    insert into public.loans (
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
    values (
      'a1111111-1111-4111-8111-111111111111',
      'Unknown debt',
      100,
      '2026-09-01',
      12,
      365,
      10,
      'education',
      10,
      1
    )
  $$,
  '23514',
  null,
  'unrecognized debt types remain rejected'
);

select * from finish();
rollback;
