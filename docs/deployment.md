# Deployment runbook

## Pre-deploy

1. Run npm ci, npm run verify, and npm run test:e2e.
2. Start local Supabase, run supabase db reset, then supabase test db.
3. Confirm the target environment provides VITE_SUPABASE_URL and
   VITE_SUPABASE_ANON_KEY.
4. Confirm the Supabase Auth site URL and allowed redirect list include the
   deployed /reset-password route.

## Existing Supabase project

The finance baseline represents tables that existed before migrations were
tracked. Compare the remote columns with
20250115000000_finance_baseline.sql, then record the baseline once:

    supabase migration repair 20250115000000 --status applied
    supabase db push --dry-run
    supabase db push

Never use supabase db reset --linked. A linked reset destroys remote data.

The Realtime migration adds only required finance tables to
supabase_realtime. Row-Level Security remains the delivery boundary, while the
client further filters user-owned tables and subscribes to payment changes only
for accessible debt IDs.

## Post-deploy

- Sign in, add an expense, and verify the header changes to Live.
- Add a named credit card or line of credit, link it to the matching owned debt,
  and verify an attributed expense appears under that account's monthly total.
- Verify paying the linked debt changes payment history without increasing
  ordinary expense totals.
- Record a fixed or prime-plus-spread APR change and verify the debt forecast
  uses it from the effective date.
- Post a statement interest charge and verify the debt balance and actual
  interest total increase while ordinary expense totals do not.
- Open a second signed-in device and verify expense, income, debt, and payment
  changes refresh the mounted dashboard.
- Disable the network briefly; verify Offline then Live appears and current
  values are refetched.
- Verify an invited participant can read the shared debt and record an
  attributable payment, but cannot edit the debt or another user's expenses.
- Verify expense totals do not include payment_events rows.

## Recovery

If a migration fails, stop and inspect supabase migration list before using
migration repair. Repair history only when the remote schema is already known
to match that migration. Roll application code back independently; do not
delete financial tables or run destructive linked resets.
