import MonthlyOwingSummary from "../components/MonthlyOwingSummary";
import { money } from "../utils/format";

export default function HomePage({
  monthlyOwingMonth,
  monthlyOwingRows,
  monthlyOwingTotalScheduled,
  monthlyOwingTotalPaid,
  monthlyOwingLoading,
  monthlyOwingError,
  cashFlow,
  onMonthChange,
}) {
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
    </div>
  );
}
