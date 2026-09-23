# Debt Payback and Expense Tracker

A React and Supabase personal-finance app for expenses, income, shared debts,
lump-sum payments, snowball or avalanche planning, and secure live dashboards.

## Requirements

- Node.js 20.19 or newer (Node 22 is used in CI)
- npm
- Supabase CLI and Docker for local database development

## Local setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and set the Supabase values:

   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<local-anon-key>
   ```

3. Start and rebuild the local Supabase database:

   ```sh
   supabase start
   supabase db reset
   ```

4. Run the app:

   ```sh
   npm run dev
   ```

## Verification

```sh
npm run verify
supabase test db
```

`npm run verify` runs ESLint, the Vitest suite, and a production build. Database tests use pgTAP against the local Supabase stack.

## Database migrations

The active migration chain now rebuilds the finance schema from a clean database. The repository's original music-scheduling SQL is retained unchanged under `supabase/legacy-migrations/music`; timestamp-compatible marker migrations remain in the active directory so existing remote migration history stays aligned without installing unrelated tables in a fresh finance database.

The finance tables existed remotely before their schema was committed here. For an existing linked project, first verify that `loans`, `rate_periods`, `scheduled_payments`, and `payment_events` match `20250115000000_finance_baseline.sql`, then record that baseline as already applied:

```sh
supabase migration repair 20250115000000 --status applied
supabase db push --dry-run
supabase db push
```

Do not run `supabase db reset --linked`; it is destructive. Use `supabase db reset` only for the local development database.

## Architecture roadmap

The deployable, stacked pull-request sequence is documented in [docs/roadmap.md](docs/roadmap.md). Every step has its own worktree and builds on the preceding branch.

Production setup and recovery checks are documented in
[docs/deployment.md](docs/deployment.md).
