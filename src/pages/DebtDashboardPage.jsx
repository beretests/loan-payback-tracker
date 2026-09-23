import { useDebtDashboard } from "../features/debts/useDebtDashboard";
import { money, pct } from "../utils/format";

export default function DebtDashboardPage({ user }) {
  const dashboard = useDebtDashboard(user);

  return (
    <div className="page-stack">
      <section className="panel">
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

      <section className="panel">
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
