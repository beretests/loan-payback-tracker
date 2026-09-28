import { useState } from "react";
import {
  ACCOUNT_TYPES,
  accountTypeLabel,
  financialAccountLabel,
} from "../features/accounts/financialAccounts";

const emptyAccount = () => ({
  name: "",
  accountType: "bank_account",
  institution: "",
  lastFour: "",
  linkedLoanId: "",
});

export default function FinancialAccountsPanel({ accountData }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAccount);
  const linkable = ["credit_card", "line_of_credit"].includes(form.accountType);
  const matchingDebts = accountData.debts.filter(
    (debt) => debt.debt_type === form.accountType,
  );

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "accountType" ? { linkedLoanId: "" } : {}),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    const saved = editingId
      ? await accountData.updateAccount(editingId, form)
      : await accountData.createAccount(form);
    if (saved) reset();
  }

  function edit(account) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      accountType: account.account_type,
      institution: account.institution ?? "",
      lastFour: account.last_four ?? "",
      linkedLoanId: account.linked_loan_id ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyAccount());
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Payment accounts</h3>
          <p>Name the cards and accounts used for expenses.</p>
        </div>
      </div>

      <form className="financial-account-form" onSubmit={submit}>
        <label>
          Account name
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Everyday Visa"
            maxLength={100}
            required
          />
        </label>
        <label>
          Type
          <select
            value={form.accountType}
            onChange={(event) => update("accountType", event.target.value)}
          >
            {ACCOUNT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Institution
          <input
            value={form.institution}
            onChange={(event) => update("institution", event.target.value)}
            placeholder="Optional"
            maxLength={100}
          />
        </label>
        <label>
          Last four digits
          <input
            value={form.lastFour}
            onChange={(event) => update("lastFour", event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="1234"
          />
        </label>
        {linkable && (
          <label>
            Linked debt
            <select
              value={form.linkedLoanId}
              onChange={(event) => update("linkedLoanId", event.target.value)}
            >
              <option value="">Not linked</option>
              {matchingDebts.map((debt) => (
                <option key={debt.id} value={debt.id}>{debt.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="form-actions">
          <button type="submit" disabled={accountData.loading}>
            {editingId ? "Save account" : "Add account"}
          </button>
          {editingId && (
            <button type="button" onClick={reset}>Cancel</button>
          )}
        </div>
      </form>

      {accountData.error && (
        <div className="auth-status auth-status--error" role="alert">
          {accountData.error}
        </div>
      )}

      <div className="account-list">
        {accountData.accounts.map((account) => (
          <div className="account-item" key={account.id}>
            <div>
              <strong>{financialAccountLabel(account)}</strong>
              <div className="data-table__muted">
                {accountTypeLabel(account.account_type)}
                {account.institution ? ` · ${account.institution}` : ""}
                {account.linkedDebt ? ` · linked to ${account.linkedDebt.name}` : ""}
              </div>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => edit(account)}>Edit</button>
              <button
                type="button"
                onClick={() => accountData.archiveAccount(account.id)}
                disabled={accountData.loading}
              >
                Archive
              </button>
            </div>
          </div>
        ))}
        {!accountData.accounts.length && (
          <p className="data-table__empty">No named payment accounts yet.</p>
        )}
      </div>
    </section>
  );
}
