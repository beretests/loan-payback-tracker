import { useMemo, useState } from "react";
import { summarizeCashFlow } from "../features/income/cashFlow";
import { useIncomeEntries } from "../features/income/useIncomeEntries";
import { money, todayUtcDateString } from "../utils/format";
import PageTaskBar from "../components/PageTaskBar";

function emptyForm() {
  return {
    source: "",
    amount: "",
    receivedOn: todayUtcDateString(),
    notes: "",
  };
}

export default function IncomePage({ user }) {
  const incomeData = useIncomeEntries(user);
  const [month, setMonth] = useState(todayUtcDateString().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const monthlyEntries = useMemo(
    () =>
      incomeData.entries.filter(
        (entry) => String(entry.received_on).slice(0, 7) === month,
      ),
    [incomeData.entries, month],
  );
  const total = summarizeCashFlow(incomeData.entries, [], month).income;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const saved = editingId
      ? await incomeData.updateEntry(editingId, form)
      : await incomeData.createEntry(form);
    if (saved) reset();
  }

  function edit(entry) {
    setEditingId(entry.id);
    setForm({
      source: entry.source,
      amount: String(entry.amount),
      receivedOn: entry.received_on,
      notes: entry.notes ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm());
  }

  return (
    <div className="page-stack">
      <PageTaskBar
        title="Income"
        tasks={[
          { target: "income-overview", label: "Overview", action: "View total" },
          { target: "income-form", label: "Income entry", action: "Add · edit" },
          { target: "income-activity", label: "Monthly income", action: "View · edit · delete" },
        ]}
      />
      <section className="panel" id="income-overview">
        <div className="section-heading">
          <div>
            <h2>Income</h2>
            <p>Record take-home income available for expenses and debt.</p>
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
        <div className="metric-card metric-card--paid">
          <div className="metric-card__label">Income this month</div>
          <div className="metric-card__value">{money(total)}</div>
        </div>
      </section>

      <section className="panel" id="income-form">
        <h3>{editingId ? "Edit income" : "Add income"}</h3>
        <form className="expense-form" onSubmit={submit}>
          <label>
            Source
            <input
              value={form.source}
              onChange={(event) => update("source", event.target.value)}
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
            Received date
            <input
              type="date"
              value={form.receivedOn}
              onChange={(event) => update("receivedOn", event.target.value)}
              required
            />
          </label>
          <label className="expense-form__notes">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={incomeData.loading}>
              {editingId ? "Save changes" : "Add income"}
            </button>
            {editingId && (
              <button type="button" onClick={reset}>Cancel</button>
            )}
          </div>
        </form>
        {incomeData.error && (
          <div className="auth-status auth-status--error" role="alert">
            {incomeData.error}
          </div>
        )}
      </section>

      <section className="panel" id="income-activity">
        <h3>Monthly income</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table__head">Date</th>
                <th className="data-table__head">Source</th>
                <th className="data-table__head">Amount</th>
                <th className="data-table__head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthlyEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.received_on}</td>
                  <td>{entry.source}</td>
                  <td>{money(Number(entry.amount))}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => edit(entry)}>Edit</button>
                      <button
                        type="button"
                        disabled={incomeData.loading}
                        onClick={() => incomeData.deleteEntry(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!monthlyEntries.length && (
                <tr>
                  <td colSpan="4" className="data-table__empty">
                    No income recorded for this month.
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
