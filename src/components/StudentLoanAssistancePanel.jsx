import { useMemo, useState } from "react";
import { useStudentLoanAssistance } from "../features/debts/useStudentLoanAssistance";
import {
  assistanceIsActive,
  requiredPaymentForDate,
} from "../features/debts/studentLoanAssistance";
import { money, todayUtcDateString } from "../utils/format";

function emptyForm() {
  return {
    assistanceType: "interest_free",
    startsOn: todayUtcDateString(),
    endsOn: "",
    requiredPayment: "",
    note: "",
  };
}

const TYPE_LABELS = {
  interest_free: "Interest-free period",
  reduced_payment: "Reduced required payment",
  payment_pause: "Payment pause",
};

export default function StudentLoanAssistancePanel({
  user,
  debts,
  onDebtsChanged,
}) {
  const assistance = useStudentLoanAssistance(
    user,
    debts,
    onDebtsChanged,
  );
  const [form, setForm] = useState(() => emptyForm());
  const periods = useMemo(
    () =>
      [...(assistance.selectedDebt?.debt_assistance_periods ?? [])].sort(
        (left, right) => right.starts_on.localeCompare(left.starts_on),
      ),
    [assistance.selectedDebt],
  );
  const today = todayUtcDateString();

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (await assistance.addPeriod(form)) setForm(emptyForm());
  }

  return (
    <section className="panel" id="student-loan-assistance">
      <div className="section-heading">
        <div>
          <h3>Student-loan assistance</h3>
          <p>
            Track interest-free, reduced-payment, and payment-pause periods.
          </p>
        </div>
        {assistance.studentLoans.length > 0 && (
          <label>
            Student loan
            <select
              value={assistance.selectedDebtId}
              onChange={(event) =>
                assistance.setSelectedDebtId(event.target.value)
              }
            >
              {assistance.studentLoans.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!assistance.studentLoans.length ? (
        <p className="form-help">
          Create a debt with the Student loan type to add assistance periods.
        </p>
      ) : (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card__label">Required payment today</div>
              <div className="metric-card__value">
                {money(requiredPaymentForDate(assistance.selectedDebt, today))}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Active assistance</div>
              <div className="metric-card__value">
                {periods.filter((period) =>
                  assistanceIsActive(period, today),
                ).length || "None"}
              </div>
            </div>
          </div>

          <form className="interest-form" onSubmit={submit}>
            <label>
              Assistance type
              <select
                value={form.assistanceType}
                onChange={(event) =>
                  updateForm("assistanceType", event.target.value)
                }
              >
                <option value="interest_free">Interest-free period</option>
                <option value="reduced_payment">
                  Reduced required payment
                </option>
                <option value="payment_pause">Payment pause</option>
              </select>
            </label>
            <label>
              Starts
              <input
                type="date"
                value={form.startsOn}
                onChange={(event) => updateForm("startsOn", event.target.value)}
                required
              />
            </label>
            <label>
              Ends (optional)
              <input
                type="date"
                value={form.endsOn}
                onChange={(event) => updateForm("endsOn", event.target.value)}
              />
            </label>
            {form.assistanceType === "reduced_payment" && (
              <label>
                Required payment
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.requiredPayment}
                  onChange={(event) =>
                    updateForm("requiredPayment", event.target.value)
                  }
                  required
                />
              </label>
            )}
            <label className="interest-form__note">
              Note
              <input
                value={form.note}
                onChange={(event) => updateForm("note", event.target.value)}
                placeholder="Program name or approval reference"
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={assistance.loading}>
                Add assistance period
              </button>
            </div>
          </form>

          <div className="table-wrap interest-history-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table__head">Rule</th>
                  <th className="data-table__head">Dates</th>
                  <th className="data-table__head">Required payment</th>
                  <th className="data-table__head">Status</th>
                  <th className="data-table__head">Note</th>
                  <th className="data-table__head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td>{TYPE_LABELS[period.assistance_type]}</td>
                    <td>
                      {period.starts_on} – {period.ends_on || "ongoing"}
                    </td>
                    <td>
                      {period.assistance_type === "reduced_payment"
                        ? money(period.required_payment)
                        : "—"}
                    </td>
                    <td>
                      {assistanceIsActive(period, today)
                        ? "Active"
                        : period.starts_on > today
                          ? "Upcoming"
                          : "Ended"}
                    </td>
                    <td>{period.note || "—"}</td>
                    <td>
                      <button
                        type="button"
                        disabled={assistance.loading}
                        onClick={() => assistance.deletePeriod(period.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!periods.length && (
                  <tr>
                    <td className="data-table__empty" colSpan="6">
                      No assistance periods recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {assistance.error && (
        <div className="auth-status auth-status--error" role="alert">
          {assistance.error}
        </div>
      )}
    </section>
  );
}
