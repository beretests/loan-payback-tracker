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

## Student-loan assistance

Student loans use the explicit student_loan debt type so balances and payments
remain separately reportable from personal loans. The
debt_assistance_periods table stores dated interest-free periods, reduced
required payments, and payment pauses. Open-ended periods have no ends_on date.

Interest-free periods override forecast and actual accrued interest only inside
their date range; the underlying rate history resumes afterward. Reduced or
paused payments adjust debt-dashboard minimums, monthly available-cash
calculations, payoff projections, and scheduled-payment status. A paused
installment is marked not required rather than missed.

Only the debt owner can create, change, or delete assistance periods. Shared
participants can read the rules affecting a shared student loan. A database
trigger prevents assistance from being attached to other debt types and
prevents a reduced payment from exceeding the regular minimum.

## Recurrence

The recurring_transactions table stores monthly or yearly definitions, not
generated ledger entries. Materialized expenses and income entries remain
independently editable. Yearly definitions retain their original month and day;
February 29 clamps to February 28 in non-leap years and returns to February 29
in leap years.

## Finite installment plans

The expense_installment_plans table describes a purchase or service with a
fixed total, a fixed number of payments, and a weekly, biweekly, or monthly
schedule. Its expense_installments rows are planning records, not spending.
Amounts are calculated in cents; equal payments are rounded down and the final
payment absorbs the remainder so the schedule always matches the plan total.

Marking an installment paid creates exactly one ordinary expense and links it
through expenses.installment_id. Until then, the installment does not affect
monthly expense or cash-flow totals. Generated expenses are managed from the
Installments task: undoing payment soft-deletes the expense and reopens the
installment. Cancelling a plan preserves paid history and cancels only its
remaining scheduled installments.

An installment may use a named credit card, line of credit, bank account, or
other payment account. As with any other purchase, a later card or line-of-credit
repayment is a payment_event and is not counted again as an expense.
