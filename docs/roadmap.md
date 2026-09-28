# Implementation roadmap

Each branch in this sequence is independently deployable and is stacked on the previous branch. Schema work precedes its UI, and Realtime is added after the transactional model is stable.

| PR | Branch | Deliverable | Primary verification |
| --- | --- | --- | --- |
| 1 | `chore/reproducible-foundation` | Reproducible finance schema, legacy migration archive, Vitest, pgTAP, CI, project documentation | Clean local reset, unit tests, build |
| 2 | `refactor/app-feature-shell` | Split the large `App.jsx` into routing, auth, data, and feature modules without changing behavior | Characterization tests and build |
| 3 | `feat/expense-schema` | User-scoped categories, expenses, recurring transaction definitions, soft deletion, RLS | pgTAP RLS isolation tests |
| 4 | `feat/expense-crud` | Add, edit, delete, filter, and summarize ordinary expenses | Component and data-service tests |
| 5 | `feat/recurring-expenses` | Recurring monthly expense templates and materialization workflow | Recurrence unit/integration tests |
| 6 | `feat/income-cash-flow` | Income entries and monthly income-minus-expense summary | Cash-flow calculation tests |
| 7 | `feat/debt-types` | Credit cards, lines of credit, loans, mortgages, informal debts, minimums, limits, due days | Migration constraints and form tests |
| 8 | `feat/debt-dashboard` | Total debt, interest cost, minimum payments, due dates, and debt detail UI | Dashboard selector tests |
| 9 | `feat/shared-contributions` | Attributed participant payments and contribution status | RLS and shared-payment tests |
| 10 | `feat/repayment-strategies` | Snowball/avalanche recommendations and payoff projection engine | Deterministic engine tests |
| 11 | `feat/combined-dashboard` | Available cash, safe extra payment, forecasts, recent activity, over-allocation warning | Cross-feature scenario tests |
| 12 | `feat/realtime-dashboard` | User-filtered Supabase subscriptions, connection state, query invalidation, reconnect refetch | Subscription lifecycle tests |
| 13 | `chore/release-polish` | Accessibility, responsive polish, end-to-end smoke coverage, deployment/runbook docs | Full CI and E2E smoke test |
| 14 | `feat/financial-accounts` | Named cards and accounts, optional debt linkage, recurring attribution, account spending totals | Account UI tests, RLS/ownership pgTAP tests |
| 15 | `feat/page-task-bars` | Above-the-fold contextual task menus on every feature tab while preserving the desktop navigation | Task-link coverage, responsive build, browser smoke tests |
| 16 | `feat/debt-interest-tracking` | Fixed, variable, promotional, and interest-free rate history plus posted statement interest and fees | APR calculation tests, balance-ledger tests, RLS pgTAP tests |
| 17 | `feat/student-loan-assistance` | Explicit student-loan reporting with dated interest-free, reduced-payment, and payment-pause rules | Assistance projection tests, schedule-status tests, RLS pgTAP tests |

## Data rules

- An ordinary expense and a debt payment are separate transaction types. Debt repayments are excluded from expense totals so cash outflow is never counted twice.
- Supabase remains the source of truth. Client state is a cache derived from user-scoped queries.
- Financial rows use soft deletion where Realtime visibility and auditability matter.
- Purchases may reference a named payment account; paying a linked credit card or line of credit remains a debt payment, not another expense.
- Forecast APR changes and posted statement interest are separate: rate history drives projections, while posted debt charges drive the authoritative balance.
- Student-loan assistance changes required-payment and interest rules only within its approved dates; it never creates a payment or ordinary expense.
- Summary and payoff calculations stay client-side for the MVP. Server-maintained aggregates can be introduced only when data volume justifies them.
- Realtime is enabled only for the required transactional tables. Reconnection triggers an authoritative refetch to recover missed events.

## Stacking workflow

Review and merge in table order. While branches are stacked, each PR targets its predecessor. After a predecessor merges, rebase the next branch on the default branch and retarget that PR. This keeps every review focused while preserving a deployable application at each stage.
