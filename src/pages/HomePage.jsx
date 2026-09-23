import MonthlyOwingSummary from "../components/MonthlyOwingSummary";
import { money } from "../utils/format";
import { useMemo } from "react";
import { useDebtDashboard } from "../features/debts/useDebtDashboard";
import { buildRepaymentPlan } from "../features/debts/repaymentPlan";
import { buildCombinedSummary } from "../features/dashboard/combinedDashboard";
import { useRecentActivity } from "../features/dashboard/useRecentActivity";
import { todayUtcDateString } from "../utils/format";

export default function HomePage({
  user,
  monthlyOwingMonth,
  monthlyOwingRows,
  monthlyOwingTotalScheduled,
  monthlyOwingTotalPaid,
  monthlyOwingLoading,
  monthlyOwingError,
  cashFlow,
  onMonthChange,
}) {
  const debtDashboard = useDebtDashboard(user);
  const recentActivity = useRecentActivity(user);
  const combined = buildCombinedSummary({
    availableAfterExpenses: cashFlow.available,
    minimumPayments: debtDashboard.summary.minimumPayments,
    plannedDebtPayments: monthlyOwingTotalScheduled,
  });
  const forecast = useMemo(
    () =>
      buildRepaymentPlan({
        debts: debtDashboard.debts,
        extraMonthly: combined.safeExtraPayment,
        strategy: "avalanche",
        startMonth: todayUtcDateString().slice(0, 7),
      }),
    [debtDashboard.debts, combined.safeExtraPayment],
  );

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Monthly cash flow</h2>
        <p className="form-help">
          Income minus ordinary expenses. Debt payments are shown separately
          below and are not counted twice.
        </p>
        <div className="metric-grid">
          <div className="metric-card metric-card--paid">
            <div className="metric-card__label">Income</div>
            <div className="metric-card__value">{money(cashFlow.income)}</div>
          </div>
          <div className="metric-card metric-card--scheduled">
            <div className="metric-card__label">Expenses</div>
            <div className="metric-card__value">{money(cashFlow.spending)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">Available after expenses</div>
            <div className="metric-card__value">{money(cashFlow.available)}</div>
          </div>
        </div>
        {cashFlow.error && (
          <div className="auth-status auth-status--error" role="alert">
            {cashFlow.error}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Payback capacity</h2>
        <div className="metric-grid">
          <DashboardMetric
            label="Outstanding debt"
            value={money(debtDashboard.summary.totalDebt)}
          />
          <DashboardMetric
            label="Minimum payments"
            value={money(debtDashboard.summary.minimumPayments)}
          />
          <DashboardMetric
            label="Safe extra payment"
            value={money(combined.safeExtraPayment)}
          />
          <DashboardMetric
            label="Projected debt-free month"
            value={forecast.payoffDate ?? "—"}
          />
        </div>
        {combined.exceedsAvailableCash && (
          <div className="cash-warning" role="alert">
            Planned debt payments exceed available cash by{" "}
            {money(combined.shortfall)}.
          </div>
        )}
      </section>
      <section className="panel">
        <MonthlyOwingSummary
          month={monthlyOwingMonth}
          rows={monthlyOwingRows}
          totalScheduled={monthlyOwingTotalScheduled}
          totalPaid={monthlyOwingTotalPaid}
          loading={monthlyOwingLoading}
          error={monthlyOwingError}
          onMonthChange={onMonthChange}
        />
      </section>
      <section className="panel">
        <h2>Recent activity</h2>
        <div className="activity-list">
          {recentActivity.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.type} · {item.date}</small>
              </span>
              <strong>{money(item.amount)}</strong>
            </div>
          ))}
          {!recentActivity.length && (
            <p className="data-table__empty">No financial activity yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardMetric({ label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
    </div>
  );
}
