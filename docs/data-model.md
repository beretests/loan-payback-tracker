# Financial data model

## Expense boundary

The expenses table contains ordinary household spending only. Debt repayments
remain in payment_events; dashboard cash-flow selectors combine the two streams
when needed but never add debt payments to expense category totals. The
expense_type value is constrained to ordinary for the MVP.

A purchase made with a credit card or line of credit is therefore one ordinary
expense attributed to that payment account. A later payment toward the card or
line of credit is recorded only as a payment_event, so it does not inflate
monthly expense totals.

## Debt interest

Each debt identifies its rate as fixed, variable (prime plus a lender spread),
or interest-free. The rate_periods ledger keeps every APR change by effective
date, including the underlying prime and spread where applicable. Promotional
rates store an expiry date and a follow-on APR so forecasts can cross the
promotion boundary without silently assuming the introductory rate continues.

The calculated APR supports planning. Actual statement interest and fees are
posted to debt_charges and increase the outstanding balance. These charges are
not ordinary expenses: the purchase was already counted when it occurred, and
the later debt payment remains a payment_event. This boundary prevents both
interest and repayments from being counted twice in spending totals.

## Named payment accounts

The financial_accounts table stores user-defined cash, bank, debit-card,
credit-card, line-of-credit, and other payment sources. Expenses and recurring
expense definitions may reference one through payment_account_id. The generic
payment_method remains as a fallback for imported and older transactions.

Credit-card and line-of-credit accounts can optionally link to an owned loan of
the same debt_type. Composite foreign keys and a validation trigger prevent
cross-user or mismatched debt links. Archiving an account is a soft deletion;
historical expense attribution remains intact.

## Ownership and deletion

User-owned expense, income, recurring, and account rows carry user_id, and
Row-Level Security compares it with auth.uid(). Composite foreign keys ensure
an expense cannot reference another user's category or named account. The
authenticated role receives no DELETE privilege on expense or financial
account tables. Deletion is an update to deleted_at, preserving auditability
and producing an RLS-filterable Realtime event.

Debt charges use debt ownership rather than a duplicated user_id. Owners may
write them; shared participants may read them but cannot change rate history or
statement charges.

## Recurrence

The recurring_transactions table stores monthly definitions, not generated
ledger entries. Materialized expenses and income entries remain independently
editable and will record their source definition in later migrations.
