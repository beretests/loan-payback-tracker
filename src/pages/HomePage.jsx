import MonthlyOwingSummary from "../components/MonthlyOwingSummary";

export default function HomePage({
  monthlyOwingMonth,
  monthlyOwingRows,
  monthlyOwingTotalScheduled,
  monthlyOwingTotalPaid,
  monthlyOwingLoading,
  monthlyOwingError,
  onMonthChange,
}) {
  return (
    <div className="page-stack">
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
