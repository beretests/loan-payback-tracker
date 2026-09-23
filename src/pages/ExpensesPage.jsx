import { useMemo, useState } from "react";
import { expensesForMonth, summarizeExpenses } from "../features/expenses/expenseSummary";
import { useExpenses } from "../features/expenses/useExpenses";
import { money, todayUtcDateString } from "../utils/format";
import RecurringExpensesPanel from "../components/RecurringExpensesPanel";

const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["debit_card", "Debit card"],
  ["credit_card", "Credit card"],
  ["bank_transfer", "Bank transfer"],
  ["other", "Other"],
];

function emptyForm(categoryId = "") {
  return {
    description: "",
    amount: "",
    spentOn: todayUtcDateString(),
    categoryId,
    paymentMethod: "other",
    notes: "",
  };
}

export default function ExpensesPage({ user }) {
  const expenseData = useExpenses(user);
  const [month, setMonth] = useState(todayUtcDateString().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());

  const summary = useMemo(
    () => summarizeExpenses(expenseData.expenses, month),
    [expenseData.expenses, month],
  );
  const monthlyExpenses = useMemo(
    () => expensesForMonth(expenseData.expenses, month),
    [expenseData.expenses, month],
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitExpense(event) {
    event.preventDefault();
    const values = {
      ...form,
      categoryId: form.categoryId || expenseData.categories[0]?.id || "",
    };
    const saved = editingId
      ? await expenseData.updateExpense(editingId, values)
      : await expenseData.createExpense(values);
    if (saved) resetForm();
  }

  function editExpense(expense) {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      spentOn: expense.spent_on,
      categoryId: expense.category_id,
      paymentMethod: expense.payment_method,
      notes: expense.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(expenseData.categories[0]?.id));
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Expenses</h2>
            <p>Track ordinary spending separately from debt repayments.</p>
          </div>
          <label>
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
        </div>

        <div className="metric-grid">
          <div className="metric-card metric-card--scheduled">
            <div className="metric-card__label">Spending this month</div>
            <div className="metric-card__value">{money(summary.total)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">Transactions</div>
            <div className="metric-card__value">{summary.count}</div>
          </div>
        </div>

        {summary.byCategory.length > 0 && (
          <div className="category-summary" aria-label="Category totals">
            {summary.byCategory.map((category) => (
              <div key={category.name}>
                <span>{category.name}</span>
                <strong>{money(category.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <RecurringExpensesPanel
        user={user}
        categories={expenseData.categories}
        onExpensesChanged={expenseData.refresh}
      />

      <section className="panel">
        <h3>{editingId ? "Edit expense" : "Add expense"}</h3>
        <form className="expense-form" onSubmit={submitExpense}>
          <label>
            Description
            <input
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              required
              maxLength={160}
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateForm("amount", event.target.value)}
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={form.spentOn}
              onChange={(event) => updateForm("spentOn", event.target.value)}
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.categoryId || expenseData.categories[0]?.id || ""}
              onChange={(event) => updateForm("categoryId", event.target.value)}
              required
            >
              {expenseData.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment method
            <select
              value={form.paymentMethod}
              onChange={(event) =>
                updateForm("paymentMethod", event.target.value)
              }
            >
              {PAYMENT_METHODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="expense-form__notes">
            Notes
            <textarea
              rows="2"
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={expenseData.loading}>
              {editingId ? "Save changes" : "Add expense"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {expenseData.error && (
          <div className="auth-status auth-status--error" role="alert">
            {expenseData.error}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Monthly activity</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table__head">Date</th>
                <th className="data-table__head">Description</th>
                <th className="data-table__head">Category</th>
                <th className="data-table__head">Method</th>
                <th className="data-table__head">Amount</th>
                <th className="data-table__head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthlyExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.spent_on}</td>
                  <td>
                    {expense.description}
                    {expense.notes && (
                      <div className="data-table__muted">{expense.notes}</div>
                    )}
                  </td>
                  <td>{expense.expense_categories?.name ?? "Uncategorized"}</td>
                  <td>{expense.payment_method.replaceAll("_", " ")}</td>
                  <td>{money(Number(expense.amount))}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => editExpense(expense)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => expenseData.deleteExpense(expense.id)}
                        disabled={expenseData.loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!monthlyExpenses.length && (
                <tr>
                  <td className="data-table__empty" colSpan="6">
                    No expenses recorded for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
