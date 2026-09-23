# Financial data model

## Expense boundary

The expenses table contains ordinary household spending only. Debt repayments
remain in payment_events; dashboard cash-flow selectors combine the two streams
when needed but never add debt payments to expense category totals. The
expense_type value is constrained to ordinary for the MVP.

## Ownership and deletion

Every new row carries user_id, and Row-Level Security compares it with
auth.uid(). Composite foreign keys ensure an expense cannot reference another
user's category. The authenticated role receives no DELETE privilege on expense
tables. Deletion is an update to deleted_at, preserving auditability and
producing an RLS-filterable Realtime event.

## Recurrence

The recurring_transactions table stores monthly definitions, not generated
ledger entries. Materialized expenses and income entries remain independently
editable and will record their source definition in later migrations.
