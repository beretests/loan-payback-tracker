import { useMemo, useState } from "react";
import {
  financialAccountLabel,
  paymentMethodForAccountType,
} from "../features/accounts/financialAccounts";
import {
  buildInstallmentSchedule,
  summarizeInstallmentPlan,
} from "../features/expenses/installmentSchedule";
import { useInstallmentPlans } from "../features/expenses/useInstallmentPlans";
import { money, todayUtcDateString } from "../utils/format";

function emptyForm() {
  return {
    description: "",
    totalAmount: "",
    installmentCount: "",
    firstDueOn: todayUtcDateString(),
    frequency: "monthly",
    categoryId: "",
    paymentMethod: "other",
    paymentAccountId: "",
    notes: "",
  };
}

export default function InstallmentPlansPanel({
  user,
  categories,
  accounts,
  onExpensesChanged,
}) {
  const installmentData = useInstallmentPlans(user, onExpensesChanged);
  const [form, setForm] = useState(emptyForm);
  const [paidOn, setPaidOn] = useState(todayUtcDateString());
  const preview = useMemo(() => {
    try {
      return buildInstallmentSchedule(form);
    } catch {
      return [];
    }
  }, [form]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateAccount(accountId) {
    const account = accounts.find((candidate) => candidate.id === accountId);
    setForm((current) => ({
      ...current,
      paymentAccountId: accountId,
      paymentMethod: account
        ? paymentMethodForAccountType(account.account_type)
        : current.paymentMethod,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    const saved = await installmentData.createPlan({
      ...form,
      categoryId: form.categoryId || categories[0]?.id || "",
    });
    if (saved) setForm(emptyForm());
  }

  return (
    <section className="panel" id="installment-plans">
      <div className="section-heading">
        <div>
          <h3>Finite installment plans</h3>
          <p>
            Schedule a fixed number of service payments. Only paid installments
            enter expense totals.
          </p>
        </div>
        <label>
          Actual payment date
          <input
            type="date"
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
          />
        </label>
      </div>

      <form className="expense-form" onSubmit={submit}>
        <label>
          Service or purchase
          <input
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            required
          />
        </label>
        <label>
          Total amount
          <input
            type="number"
            min="0.02"
            step="0.01"
            value={form.totalAmount}
            onChange={(event) => update("totalAmount", event.target.value)}
            required
          />
        </label>
        <label>
          Number of installments
          <input
            type="number"
            min="2"
            max="240"
            value={form.installmentCount}
            onChange={(event) =>
              update("installmentCount", event.target.value)
            }
            required
          />
        </label>
        <label>
          First due date
          <input
            type="date"
            value={form.firstDueOn}
            onChange={(event) => update("firstDueOn", event.target.value)}
            required
          />
        </label>
        <label>
          Frequency
          <select
            value={form.frequency}
            onChange={(event) => update("frequency", event.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Weekly</option>
          </select>
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
            onChange={(event) => updateAccount(event.target.value)}
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
        <label className="expense-form__notes">
          Notes
          <input
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={installmentData.loading}>
            Create installment plan
          </button>
          {preview.length > 0 && (
            <span className="form-help">
              {money(preview[0].amount)} × {preview.length - 1}, then{" "}
              {money(preview.at(-1).amount)} · final due{" "}
              {preview.at(-1).dueOn}
            </span>
          )}
        </div>
      </form>

      {installmentData.error && (
        <div className="auth-status auth-status--error" role="alert">
          {installmentData.error}
        </div>
      )}

      <div className="installment-plan-list">
        {installmentData.plans.map((plan) => (
          <InstallmentPlan
            key={plan.id}
            plan={plan}
            paidOn={paidOn}
            loading={installmentData.loading}
            onPaid={installmentData.markPaid}
            onUndo={installmentData.undoPayment}
            onCancel={installmentData.cancelPlan}
          />
        ))}
        {!installmentData.plans.length && (
          <p className="data-table__empty">No installment plans yet.</p>
        )}
      </div>
    </section>
  );
}

function InstallmentPlan({
  plan,
  paidOn,
  loading,
  onPaid,
  onUndo,
  onCancel,
}) {
  const summary = summarizeInstallmentPlan(plan);
  const installments = [...(plan.expense_installments ?? [])].sort(
    (left, right) => left.ordinal - right.ordinal,
  );
  return (
    <article className="installment-plan">
      <div className="installment-plan__heading">
        <div>
          <strong>{plan.description}</strong>
          <div className="data-table__muted">
            {plan.status.replaceAll("_", " ")} · {money(plan.total_amount)} · {summary.paidCount}/
            {plan.installment_count} paid · {money(summary.outstandingAmount)}{" "}
            outstanding
          </div>
        </div>
        <button
          type="button"
          disabled={loading || plan.status !== "active"}
          onClick={() => onCancel(plan.id)}
        >
          Cancel remaining
        </button>
      </div>
      <div className="installment-rows">
        {installments.map((installment) => (
          <div className="installment-row" key={installment.id}>
            <span>
              #{installment.ordinal} · {installment.due_on} ·{" "}
              {money(installment.amount)}
            </span>
            <span>{installment.status.replaceAll("_", " ")}</span>
            {installment.status === "scheduled" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => onPaid(installment.id, paidOn)}
              >
                Mark paid
              </button>
            )}
            {installment.status === "paid" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => onUndo(installment.id)}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
