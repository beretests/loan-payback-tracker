import { useState } from "react";
import { useRecurringExpenses } from "../features/expenses/useRecurringExpenses";
import {
  financialAccountLabel,
  paymentMethodForAccountType,
} from "../features/accounts/financialAccounts";
import { money, todayUtcDateString } from "../utils/format";

function initialForm() {
  return {
    description: "",
    amount: "",
    categoryId: "",
    paymentMethod: "other",
    paymentAccountId: "",
    startsOn: todayUtcDateString(),
  };
}

export default function RecurringExpensesPanel({
  user,
  categories,
  accounts,
  onExpensesChanged,
}) {
  const recurring = useRecurringExpenses(user, onExpensesChanged);
  const [form, setForm] = useState(initialForm);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePaymentAccount(value) {
    const account = accounts.find((candidate) => candidate.id === value);
    setForm((current) => ({
      ...current,
      paymentAccountId: value,
      paymentMethod: account
        ? paymentMethodForAccountType(account.account_type)
        : current.paymentMethod,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    const saved = await recurring.createDefinition({
      ...form,
      categoryId: form.categoryId || categories[0]?.id || "",
    });
    if (saved) setForm(initialForm());
  }

  return (
    <section className="panel" id="recurring-expenses">
      <h3>Recurring monthly expenses</h3>
      <p className="form-help">
        Due entries are generated once and remain editable as ordinary expenses.
      </p>
      <form className="expense-form" onSubmit={submit}>
        <label>
          Description
          <input
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            required
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            value={form.categoryId || categories[0]?.id || ""}
            onChange={(event) => update("categoryId", event.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment account
          <select
            value={form.paymentAccountId}
            onChange={(event) => updatePaymentAccount(event.target.value)}
          >
            <option value="">Use generic method</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {financialAccountLabel(account)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment method
          <select
            value={form.paymentMethod}
            onChange={(event) => update("paymentMethod", event.target.value)}
          >
            <option value="other">Other</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="credit_card">Credit card</option>
            <option value="line_of_credit">Line of credit</option>
            <option value="debit_card">Debit card</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label>
          First date
          <input
            type="date"
            value={form.startsOn}
            onChange={(event) => update("startsOn", event.target.value)}
            required
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={recurring.loading}>
            Add recurring expense
          </button>
        </div>
      </form>

      {recurring.error && (
        <div className="auth-status auth-status--error" role="alert">
          {recurring.error}
        </div>
      )}

      <div className="recurring-list">
        {recurring.definitions.map((definition) => (
          <div className="recurring-item" key={definition.id}>
            <div>
              <strong>{definition.description}</strong>
              <div className="data-table__muted">
                {definition.expense_categories?.name} ·{" "}
                {money(Number(definition.amount))} · next{" "}
                {definition.next_occurrence_on}
                {definition.financial_accounts
                  ? ` · ${financialAccountLabel(definition.financial_accounts)}`
                  : ""}
              </div>
            </div>
            <span className={definition.is_active ? "status-live" : ""}>
              {definition.is_active ? "Active" : "Paused"}
            </span>
            <div className="row-actions">
              <button
                type="button"
                onClick={() => recurring.toggleDefinition(definition)}
                disabled={recurring.loading}
              >
                {definition.is_active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => recurring.deleteDefinition(definition.id)}
                disabled={recurring.loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!recurring.definitions.length && (
          <p className="data-table__empty">No recurring expenses yet.</p>
        )}
      </div>
    </section>
  );
}
