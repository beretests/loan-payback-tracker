begin;

select plan(4);

select has_column(
  'public',
  'payment_events',
  'recorded_by',
  'payments retain the participant who recorded them'
);
select col_is_fk(
  'public',
  'payment_events',
  'recorded_by',
  'payment actors reference authenticated users'
);
select policies_are(
  'public',
  'payment_events',
  array[
    'events_owner_delete',
    'events_owner_select',
    'events_owner_update',
    'events_participant_insert',
    'events_shared_select'
  ],
  'payment event policies include participant inserts'
);
select has_index(
  'public',
  'payment_events',
  'payment_events_recorded_by_idx',
  'participant contribution lookups are indexed'
);

select * from finish();
rollback;
