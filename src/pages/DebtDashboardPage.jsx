import { useMemo, useState } from "react";
import { useDebtDashboard } from "../features/debts/useDebtDashboard";
import { buildRepaymentPlan } from "../features/debts/repaymentPlan";
import { money, pct, todayUtcDateString } from "../utils/format";
import PageTaskBar from "../components/PageTaskBar";

export default function DebtDashboardPage({ user }) {
  const dashboard = useDebtDashboard(user);
  const [strategy, setStrategy] = useState("avalanche");
  const [extraMonthly, setExtraMonthly] = useState("0");
  const plan = useMemo(
    () =>
      buildRepaymentPlan({
        debts: dashboard.debts,
        extraMonthly: Number(extraMonthly || 0),
        strategy,
        startMonth: todayUtcDateString().slice(0, 7),
      }),
    [dashboard.debts, extraMonthly, strategy],
  );

  return (
    <div className="page-stack">
      <PageTaskBar
        title="Debts"
        tasks={[
          { target: "debt-overview", label: "Overview", action: "View balances · minimums" },
          { target: "repayment-strategy", label: "Repayment plan", action: "Compare strategies" },
          { target: "debt-list", label: "Debt details", action: "Review due dates · contributions" },
        ]}
      />
      <section className="panel" id="debt-overview">
        <div className="section-heading">
          <div>
            <h2>Debt dashboard</h2>
            <p>Balances, minimums, interest cost, and upcoming due dates.</p>
          </div>
        </div>
        <div className="metric-grid">
          <Metric label="Total debt" value={money(dashboard.summary.totalDebt)} />
          <Metric
            label="Monthly minimums"
            value={money(dashboard.summary.minimumPayments)}
          />
          <Metric
            label="Estimated monthly interest"
            value={money(dashboard.summary.monthlyInterest)}
          />
        </div>
        {dashboard.error && (
          <div className="auth-status auth-status--error" role="alert">
            {dashboard.error}
          </div>
        )}
      </section>

      <section className="panel" id="repayment-strategy">
        <div className="section-heading">
          <div>
            <h3>Repayment strategy</h3>
            <p>
              Keep the total monthly debt budget constant as balances are paid
              off.
            </p>
          </div>
        </div>
        <div className="planner-controls">
          <label>
            Strategy
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value)}
            >
              <option value="avalanche">Avalanche — highest rate first</option>
              <option value="snowball">Snowball — smallest balance first</option>
            </select>
          </label>
          <label>
            Extra per month
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraMonthly}
              onChange={(event) => setExtraMonthly(event.target.value)}
            />
          </label>
        </div>
        <div className="metric-grid">
          <Metric
            label="Projected debt-free month"
            value={plan.payoffDate ?? "Needs a larger payment"}
          />
          <Metric
            label="Projected interest"
            value={money(plan.totalInterest)}
          />
          <Metric
            label="Months remaining"
            value={plan.months ?? "—"}
          />
        </div>
        {plan.payoffOrder.length > 0 && (
          <p className="form-help">
            Payoff order: {plan.payoffOrder.join(" → ")}
          </p>
        )}
      </section>

      <section className="panel" id="debt-list">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table__head">Debt</th>
                <th className="data-table__head">Type</th>
                <th className="data-table__head">Balance</th>
                <th className="data-table__head">Rate</th>
                <th className="data-table__head">Minimum</th>
                <th className="data-table__head">Next due</th>
                <th className="data-table__head">Your payments</th>
                <th className="data-table__head">Shared payments</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.debts.map((debt) => (
                <tr key={debt.id}>
                  <td>{debt.name}</td>
                  <td>{debt.debt_type.replaceAll("_", " ")}</td>
                  <td>{money(debt.currentBalance)}</td>
                  <td>{pct(debt.currentAnnualRate)}</td>
                  <td>{money(Number(debt.minimum_payment))}</td>
                  <td>{debt.nextDueDate}</td>
                  <td>{money(debt.yourContributions)}</td>
                  <td>{money(debt.sharedContributions)}</td>
                </tr>
              ))}
              {!dashboard.debts.length && (
                <tr>
                  <td className="data-table__empty" colSpan="8">
                    No debts to display.
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

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
    </div>
  );
}
