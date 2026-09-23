begin;

select plan(4);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'first@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'second@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

insert into public.expense_categories (id, user_id, name)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Housing'
);

insert into public.expenses (
  user_id,
  category_id,
  description,
  amount,
  spent_on,
  payment_method
)
values (
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Rent',
  1200,
  '2026-09-01',
  'bank_transfer'
);

select results_eq(
  'select count(*)::integer from public.expenses',
  array[1],
  'a user can read their own expense'
);

select throws_ok(
  $$
    insert into public.expense_categories (user_id, name)
    values ('22222222-2222-4222-8222-222222222222', 'Hidden')
  $$,
  '42501',
  null,
  'a user cannot insert a category for another user'
);

reset role;
insert into public.expense_categories (id, user_id, name)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Private'
);
insert into public.expenses (
  user_id,
  category_id,
  description,
  amount,
  spent_on
)
values (
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Private expense',
  50,
  '2026-09-02'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select results_eq(
  'select count(*)::integer from public.expenses',
  array[1],
  'another user expense is not visible'
);

select lives_ok(
  $$
    update public.expenses
    set deleted_at = now()
    where user_id = '11111111-1111-4111-8111-111111111111'
  $$,
  'a user can soft-delete their own expense'
);

select * from finish();
rollback;
