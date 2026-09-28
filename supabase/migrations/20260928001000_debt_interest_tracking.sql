alter table public.loans
  alter column prime_spread drop not null,
  alter column prime_spread drop default,
  add column rate_type text not null default 'variable',
  add column promo_rate_ends_on date,
  add column post_promo_annual_rate numeric;

alter table public.loans
  alter column rate_type set default 'fixed',
  add constraint loans_rate_type_check
    check (rate_type in ('fixed', 'variable', 'interest_free')),
  add constraint loans_variable_spread_check
    check (rate_type <> 'variable' or prime_spread is not null),
  add constraint loans_promo_rate_check
    check (
      (promo_rate_ends_on is null and post_promo_annual_rate is null)
      or (
        promo_rate_ends_on is not null
        and post_promo_annual_rate is not null
        and post_promo_annual_rate >= 0
      )
    );

alter table public.rate_periods
  add column rate_kind text not null default 'standard'
    check (rate_kind in ('standard', 'promotional')),
  add column source text not null default 'manual'
    check (source in ('manual', 'prime_sync', 'promotion_expiry')),
  add column prime_rate numeric check (prime_rate is null or prime_rate >= 0),
  add column spread numeric,
  add column note text;

create or replace function public.record_debt_rate(
  p_loan_id uuid,
  p_effective_date date,
  p_rate_type text,
  p_annual_rate numeric,
  p_prime_rate numeric default null,
  p_spread numeric default null,
  p_is_promotional boolean default false,
  p_promo_ends_on date default null,
  p_post_promo_annual_rate numeric default null,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_loan_owner(p_loan_id) then
    raise exception 'Only the debt owner can record rates';
  end if;
  if p_rate_type not in ('fixed', 'variable', 'interest_free') then
    raise exception 'Unsupported rate type';
  end if;
  if p_annual_rate is null or p_annual_rate < 0 then
    raise exception 'Annual rate cannot be negative';
  end if;
  if p_rate_type = 'interest_free' and p_annual_rate <> 0 then
    raise exception 'Interest-free debts must use a zero annual rate';
  end if;
  if p_rate_type = 'variable'
    and (p_prime_rate is null or p_spread is null) then
    raise exception 'Variable rates require prime and spread';
  end if;
  if p_is_promotional and (
    p_promo_ends_on is null
    or p_post_promo_annual_rate is null
    or p_promo_ends_on < p_effective_date
  ) then
    raise exception 'Promotional rates require a valid expiry and follow-on rate';
  end if;

  insert into public.rate_periods (
    loan_id,
    effective_date,
    annual_rate,
    rate_kind,
    source,
    prime_rate,
    spread,
    note
  )
  values (
    p_loan_id,
    p_effective_date,
    p_annual_rate,
    case when p_is_promotional then 'promotional' else 'standard' end,
    'manual',
    case when p_rate_type = 'variable' then p_prime_rate else null end,
    case when p_rate_type = 'variable' then p_spread else null end,
    nullif(trim(p_note), '')
  )
  on conflict (loan_id, effective_date)
  do update set
    annual_rate = excluded.annual_rate,
    rate_kind = excluded.rate_kind,
    source = excluded.source,
    prime_rate = excluded.prime_rate,
    spread = excluded.spread,
    note = excluded.note;

  if p_is_promotional then
    insert into public.rate_periods (
      loan_id,
      effective_date,
      annual_rate,
      rate_kind,
      source,
      note
    )
    values (
      p_loan_id,
      p_promo_ends_on + 1,
      p_post_promo_annual_rate,
      'standard',
      'promotion_expiry',
      'Rate after promotion'
    )
    on conflict (loan_id, effective_date)
    do update set
      annual_rate = excluded.annual_rate,
      rate_kind = excluded.rate_kind,
      source = excluded.source,
      prime_rate = null,
      spread = null,
      note = excluded.note;
  else
    delete from public.rate_periods
    where loan_id = p_loan_id
      and source = 'promotion_expiry'
      and effective_date >= p_effective_date;
  end if;

  update public.loans
  set
    rate_type = p_rate_type,
    prime_spread = case
      when p_rate_type = 'variable' then p_spread
      else null
    end,
    promo_rate_ends_on = case
      when p_is_promotional then p_promo_ends_on
      else null
    end,
    post_promo_annual_rate = case
      when p_is_promotional then p_post_promo_annual_rate
      else null
    end
  where id = p_loan_id;
end;
$$;

revoke all on function public.record_debt_rate(
  uuid, date, text, numeric, numeric, numeric, boolean, date, numeric, text
) from public, anon;
grant execute on function public.record_debt_rate(
  uuid, date, text, numeric, numeric, numeric, boolean, date, numeric, text
) to authenticated;

create table public.debt_charges (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  charged_on date not null,
  amount numeric(14, 2) not null check (amount > 0),
  charge_type text not null
    check (charge_type in ('interest', 'fee')),
  note text,
  recorded_by uuid not null default auth.uid()
    references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index debt_charges_loan_date_idx
  on public.debt_charges (loan_id, charged_on, created_at);

alter table public.debt_charges enable row level security;

create policy "debt_charges_owner_select"
  on public.debt_charges for select to authenticated
  using (private.is_loan_owner(loan_id));
create policy "debt_charges_shared_select"
  on public.debt_charges for select to authenticated
  using (private.is_loan_shared_with_current_user(loan_id));
create policy "debt_charges_owner_insert"
  on public.debt_charges for insert to authenticated
  with check (
    private.is_loan_owner(loan_id)
    and recorded_by = (select auth.uid())
  );
create policy "debt_charges_owner_update"
  on public.debt_charges for update to authenticated
  using (private.is_loan_owner(loan_id))
  with check (
    private.is_loan_owner(loan_id)
    and recorded_by = (select auth.uid())
  );
create policy "debt_charges_owner_delete"
  on public.debt_charges for delete to authenticated
  using (private.is_loan_owner(loan_id));

revoke all on public.debt_charges from anon, authenticated;
grant select, insert, update, delete on public.debt_charges to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debt_charges'
  ) then
    alter publication supabase_realtime add table public.debt_charges;
  end if;
end;
$$;

alter table public.debt_charges replica identity full;
