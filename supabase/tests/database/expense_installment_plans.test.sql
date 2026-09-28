begin;

select plan(31);

select has_table('public', 'expense_installment_plans', 'installment plans exist');
select has_table('public', 'expense_installments', 'installments exist');
select has_column(
  'public',
  'expenses',
  'installment_id',
  'paid expenses retain installment provenance'
);
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.expense_installment_plans'::regclass$$,
  array[true],
  'installment plans enforce RLS'
);
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.expense_installments'::regclass$$,
  array[true],
  'installments enforce RLS'
);
select policies_are(
  'public',
  'expense_installment_plans',
  array[
    'installment_plans_insert_own',
    'installment_plans_select_own',
    'installment_plans_update_own'
  ],
  'plans are user scoped'
);
select policies_are(
  'public',
  'expense_installments',
  array[
    'installments_insert_own',
    'installments_select_own',
    'installments_update_own'
  ],
  'installments are user scoped'
);
select table_privs_are(
  'public',
  'expense_installment_plans',
  'authenticated',
  array['SELECT'],
  'plans can only be changed through their guarded functions'
);
select table_privs_are(
  'public',
  'expense_installments',
  'authenticated',
  array['SELECT'],
  'installments can only be changed through their guarded functions'
);
select has_function(
  'public',
  'create_expense_installment_plan',
  array['text','numeric','integer','date','text','uuid','text','uuid','text','jsonb'],
  'plans are created atomically'
);
select has_function(
  'public',
  'pay_expense_installment',
  array['uuid','date'],
  'installments are paid atomically'
);

insert into auth.users (id, email)
values
  ('b1111111-1111-4111-8111-111111111111', 'plan-owner@example.com'),
  ('b2222222-2222-4222-8222-222222222222', 'other-user@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'b1111111-1111-4111-8111-111111111111',
  true
);

insert into public.expense_categories (id, user_id, name)
values (
  'b3333333-3333-4333-8333-333333333333',
  'b1111111-1111-4111-8111-111111111111',
  'Services'
);

select lives_ok(
  $$
    select public.create_expense_installment_plan(
      'Professional service',
      100.01,
      3,
      '2026-09-11',
      'monthly',
      'b3333333-3333-4333-8333-333333333333',
      'bank_transfer',
      null,
      'Three invoices',
      '[
        {"ordinal":1,"dueOn":"2026-09-11","amount":33.33},
        {"ordinal":2,"dueOn":"2026-10-11","amount":33.33},
        {"ordinal":3,"dueOn":"2026-11-11","amount":33.35}
      ]'::jsonb
    )
  $$,
  'an owner can create a finite plan'
);
select results_eq(
  'select count(*)::integer from public.expense_installment_plans',
  array[1],
  'one plan is created'
);
select results_eq(
  'select count(*)::integer from public.expense_installments',
  array[3],
  'the exact installment count is created'
);
select results_eq(
  'select sum(amount) from public.expense_installments',
  array[100.01::numeric],
  'installments equal the plan total'
);
select results_eq(
  'select amount from public.expense_installments where ordinal = 3',
  array[33.35::numeric],
  'the final installment retains the rounding remainder'
);
select results_eq(
  'select count(*)::integer from public.expenses',
  array[0],
  'creating a plan does not count the total as spending'
);

select lives_ok(
  $$
    select public.pay_expense_installment(
      (select id from public.expense_installments where ordinal = 1),
      '2026-09-11'
    )
  $$,
  'an installment can be marked paid'
);
select results_eq(
  'select count(*)::integer from public.expenses where deleted_at is null',
  array[1],
  'a paid installment creates one ordinary expense'
);
select results_eq(
  'select amount from public.expenses where deleted_at is null',
  array[33.33::numeric],
  'only the installment amount enters spending'
);
select results_eq(
  'select status from public.expense_installments where ordinal = 1',
  array['paid'::text],
  'the installment records its paid status'
);
select throws_ok(
  $$update public.expenses set amount = 1 where deleted_at is null$$,
  'P0001',
  'Installment expenses must be managed through the installment plan',
  'generated expenses cannot be edited outside the installment workflow'
);
select throws_ok(
  $$
    select public.pay_expense_installment(
      (select id from public.expense_installments where ordinal = 1),
      '2026-09-12'
    )
  $$,
  'P0001',
  'Only a scheduled installment can be paid',
  'an installment cannot be counted twice'
);
select lives_ok(
  $$
    select public.undo_expense_installment_payment(
      (select id from public.expense_installments where ordinal = 1)
    )
  $$,
  'a paid installment can be undone'
);
select results_eq(
  'select count(*)::integer from public.expenses where deleted_at is null',
  array[0],
  'undo removes the generated expense from totals'
);
select lives_ok(
  $$
    select public.cancel_expense_installment_plan(
      (select id from public.expense_installment_plans)
    )
  $$,
  'remaining installments can be cancelled'
);
select results_eq(
  'select status from public.expense_installment_plans',
  array['cancelled'::text],
  'the plan retains cancelled status for audit'
);
select results_eq(
  'select count(*)::integer from public.expense_installments where status = ''cancelled''',
  array[3],
  'all remaining installments are cancelled'
);
select results_eq(
  $$
    select count(*)::integer from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('expense_installment_plans', 'expense_installments')
  $$,
  array[2],
  'plan and installment changes are realtime'
);
select results_eq(
  $$
    select count(*)::integer from pg_class
    where oid in (
      'public.expense_installment_plans'::regclass,
      'public.expense_installments'::regclass
    ) and relreplident = 'f'
  $$,
  array[2],
  'plan and installment updates expose full rows'
);

select set_config(
  'request.jwt.claim.sub',
  'b2222222-2222-4222-8222-222222222222',
  true
);
select results_eq(
  'select count(*)::integer from public.expense_installment_plans',
  array[0],
  'another user cannot read the plan'
);

select * from finish();
rollback;
