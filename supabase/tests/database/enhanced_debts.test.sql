begin;

select plan(8);

select has_column('public', 'loans', 'debt_type', 'debts have a type');
select has_column(
  'public',
  'loans',
  'minimum_payment',
  'debts have a minimum payment'
);
select has_column('public', 'loans', 'credit_limit', 'debts may have a limit');
select has_column('public', 'loans', 'due_day', 'debts have a due day');
select col_not_null(
  'public',
  'loans',
  'debt_type',
  'debt type is always present'
);
select col_not_null(
  'public',
  'loans',
  'minimum_payment',
  'minimum payment is always present'
);
select col_not_null('public', 'loans', 'due_day', 'due day is always present');
select has_check('public', 'loans', 'loans_debt_type_check', 'types are constrained');

select * from finish();
rollback;
