begin;

select plan(21);

select has_column('public', 'loans', 'rate_type', 'debts track rate type');
select has_column(
  'public',
  'loans',
  'promo_rate_ends_on',
  'debts can track promotion expiry'
);
select has_column(
  'public',
  'loans',
  'post_promo_annual_rate',
  'debts can track the rate after a promotion'
);
select has_column(
  'public',
  'rate_periods',
  'prime_rate',
  'rate periods retain the underlying prime rate'
);
select has_column(
  'public',
  'rate_periods',
  'spread',
  'rate periods retain their variable spread'
);
select has_table('public', 'debt_charges', 'posted debt charges exist');
select has_function(
  'public',
  'record_debt_rate',
  array[
    'uuid',
    'date',
    'text',
    'numeric',
    'numeric',
    'numeric',
    'boolean',
    'date',
    'numeric',
    'text'
  ],
  'rate changes are recorded atomically'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.debt_charges'::regclass
  $$,
  array[true],
  'posted debt charges enforce RLS'
);

select policies_are(
  'public',
  'debt_charges',
  array[
    'debt_charges_owner_delete',
    'debt_charges_owner_insert',
    'debt_charges_owner_select',
    'debt_charges_owner_update',
    'debt_charges_shared_select'
  ],
  'posted debt charges use owner-write and participant-read policies'
);

insert into auth.users (id, email)
values
  ('91919191-9191-4191-8191-919191919191', 'rate-owner@example.com'),
  ('92929292-9292-4292-8292-929292929292', 'rate-viewer@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91919191-9191-4191-8191-919191919191',
  true
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
  prime_spread,
  promo_rate_ends_on,
  post_promo_annual_rate
)
values (
  '93939393-9393-4393-8393-939393939393',
  '91919191-9191-4191-8191-919191919191',
  'Variable LoC',
  5000,
  '2026-09-01',
  36,
  365,
  175,
  'line_of_credit',
  125,
  12,
  'variable',
  0.02,
  '2027-03-31',
  0.095
);

select results_eq(
  $$
    select rate_type
    from public.loans
    where id = '93939393-9393-4393-8393-939393939393'
  $$,
  array['variable'::text],
  'a debt retains its rate basis'
);

select lives_ok(
  $$
    select public.record_debt_rate(
      '93939393-9393-4393-8393-939393939393',
      '2026-09-01',
      'variable',
      0.0695,
      0.0495,
      0.02,
      true,
      '2027-03-31',
      0.095,
      'Introductory rate'
    )
  $$,
  'an owner can atomically record a promotional variable rate'
);

select results_eq(
  $$
    select annual_rate
    from public.rate_periods
    where loan_id = '93939393-9393-4393-8393-939393939393'
      and effective_date = '2026-09-01'
  $$,
  array[0.0695::numeric],
  'effective APR history is retained'
);

select results_eq(
  $$
    select annual_rate
    from public.rate_periods
    where loan_id = '93939393-9393-4393-8393-939393939393'
      and effective_date = '2027-04-01'
      and source = 'promotion_expiry'
  $$,
  array[0.095::numeric],
  'a promotion schedules its follow-on APR'
);

insert into public.debt_charges (
  id,
  loan_id,
  charged_on,
  amount,
  charge_type,
  note
)
values (
  '94949494-9494-4494-8494-949494949494',
  '93939393-9393-4393-8393-939393939393',
  '2026-09-30',
  31.25,
  'interest',
  'Statement interest'
);

select results_eq(
  $$
    select recorded_by
    from public.debt_charges
    where id = '94949494-9494-4494-8494-949494949494'
  $$,
  array['91919191-9191-4191-8191-919191919191'::uuid],
  'posted charges identify the owner who recorded them'
);

select lives_ok(
  $$
    update public.debt_charges
    set note = 'September statement interest'
    where id = '94949494-9494-4494-8494-949494949494'
  $$,
  'an owner can update a posted charge'
);

insert into public.loan_shares (loan_id, invited_email)
values (
  '93939393-9393-4393-8393-939393939393',
  'rate-viewer@example.com'
);

select set_config(
  'request.jwt.claim.sub',
  '92929292-9292-4292-8292-929292929292',
  true
);
select set_config(
  'request.jwt.claim.email',
  'rate-viewer@example.com',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"92929292-9292-4292-8292-929292929292","email":"rate-viewer@example.com"}',
  true
);

select results_eq(
  'select count(*)::integer from public.debt_charges',
  array[1],
  'a shared participant can read posted interest'
);

select throws_ok(
  $$
    insert into public.debt_charges (
      loan_id,
      charged_on,
      amount,
      charge_type
    )
    values (
      '93939393-9393-4393-8393-939393939393',
      '2026-10-31',
      30,
      'interest'
    )
  $$,
  '42501',
  null,
  'a shared participant cannot post interest charges'
);

select results_eq(
  $$
    update public.debt_charges
    set amount = 1
    where id = '94949494-9494-4494-8494-949494949494'
    returning amount
  $$,
  array[]::numeric[],
  'a shared participant cannot change posted charges'
);

select set_config(
  'request.jwt.claim.sub',
  '91919191-9191-4191-8191-919191919191',
  true
);

select lives_ok(
  $$
    delete from public.debt_charges
    where id = '94949494-9494-4494-8494-949494949494'
  $$,
  'an owner can remove an incorrectly posted charge'
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
      due_day,
      rate_type,
      prime_spread
    )
    values (
      '91919191-9191-4191-8191-919191919191',
      'Missing spread',
      100,
      '2026-09-01',
      12,
      365,
      10,
      'line_of_credit',
      10,
      5,
      'variable',
      null
    )
  $$,
  '23514',
  null,
  'a variable debt requires a prime spread'
);

select results_eq(
  $$
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debt_charges'
  $$,
  array[1],
  'posted debt charges are published for Realtime'
);

select * from finish();
rollback;
