alter table public.payment_events
  add column recorded_by uuid references auth.users(id) on delete set null;

update public.payment_events as event
set recorded_by = loan.user_id
from public.loans as loan
where loan.id = event.loan_id
  and event.recorded_by is null;

alter table public.payment_events
  alter column recorded_by set default auth.uid();

create index payment_events_recorded_by_idx
  on public.payment_events (recorded_by, paid_date desc);

drop policy if exists "events_owner_insert" on public.payment_events;
drop policy if exists "events_participant_insert" on public.payment_events;

create policy "events_participant_insert"
  on public.payment_events
  for insert
  to authenticated
  with check (
    recorded_by = (select auth.uid())
    and (
      private.is_loan_owner(loan_id)
      or private.is_loan_shared_with_current_user(loan_id)
    )
  );
