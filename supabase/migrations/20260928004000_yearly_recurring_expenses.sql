alter table public.recurring_transactions
  drop constraint recurring_transactions_cadence_check,
  add constraint recurring_transactions_cadence_check
    check (cadence in ('monthly', 'yearly'));

create or replace function private.next_yearly_occurrence(
  occurrence_date date,
  requested_month integer,
  requested_day integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  with bounds as (
    select
      make_date(
        extract(year from occurrence_date)::integer + 1,
        requested_month,
        1
      ) as month_start
  ), month_bounds as (
    select
      month_start,
      (month_start + interval '1 month' - interval '1 day')::date as month_end
    from bounds
  )
  select month_start
    + (least(requested_day, extract(day from month_end)::integer) - 1)
  from month_bounds;
$$;

create or replace function public.materialize_recurring_expenses(
  target_date date default current_date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  definition record;
  occurrence date;
  inserted_rows integer;
  created_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;

  for definition in
    select *
    from public.recurring_transactions
    where user_id = (select auth.uid())
      and transaction_type = 'expense'
      and is_active
      and deleted_at is null
      and next_occurrence_on <= target_date
    order by next_occurrence_on, id
  loop
    occurrence := definition.next_occurrence_on;

    while occurrence <= target_date
      and (definition.ends_on is null or occurrence <= definition.ends_on)
    loop
      insert into public.expenses (
        user_id,
        category_id,
        description,
        amount,
        spent_on,
        payment_method,
        payment_account_id,
        expense_type,
        recurring_transaction_id
      )
      values (
        definition.user_id,
        definition.category_id,
        definition.description,
        definition.amount,
        occurrence,
        coalesce(definition.payment_method, 'other'),
        definition.payment_account_id,
        'ordinary',
        definition.id
      )
      on conflict (recurring_transaction_id, spent_on)
        where recurring_transaction_id is not null
      do nothing;

      get diagnostics inserted_rows = row_count;
      created_count := created_count + inserted_rows;
      occurrence := case definition.cadence
        when 'yearly' then private.next_yearly_occurrence(
          occurrence,
          extract(month from definition.starts_on)::integer,
          definition.day_of_month
        )
        else private.next_monthly_occurrence(
          occurrence,
          definition.day_of_month
        )
      end;
    end loop;

    update public.recurring_transactions
    set
      next_occurrence_on = occurrence,
      is_active = case
        when definition.ends_on is not null
          and occurrence > definition.ends_on
        then false
        else is_active
      end
    where id = definition.id;
  end loop;

  return created_count;
end;
$$;

revoke all on function private.next_yearly_occurrence(date, integer, integer)
  from public, anon;
grant execute on function private.next_yearly_occurrence(date, integer, integer)
  to authenticated;
