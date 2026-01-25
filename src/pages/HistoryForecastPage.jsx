import LoanSelector from "../components/LoanSelector";
import TabSwitcher from "../components/TabSwitcher";
import ActualHistorySection from "../components/ActualHistorySection";
import ForecastSection from "../components/ForecastSection";

export default function HistoryForecastPage({
  loans,
  selectedLoanId,
  loan,
  ratePeriods,
  scheduled,
  events,
  onSelectLoan,
  tab,
  onTabChange,
  actualSchedule,
  forecastSchedule,
  onExportCSV,
  onDeleteEvent,
}) {
  return (
    <div className="page-stack">
      <section className="panel">
        <LoanSelector
          loans={loans}
          selectedLoanId={selectedLoanId}
          loan={loan}
          ratePeriods={ratePeriods}
          scheduled={scheduled}
          events={events}
          onSelectLoan={onSelectLoan}
        />
      </section>

      <section className="panel">
        {loan ? (
          <>
            <TabSwitcher tab={tab} onTabChange={onTabChange} />
            <div style={{ marginTop: 12 }}>
              {tab === "actual" ? (
                <ActualHistorySection
                  actualSchedule={actualSchedule}
                  events={events}
                  onExportCSV={onExportCSV}
                  onDeleteEvent={onDeleteEvent}
                />
              ) : (
                <ForecastSection forecastSchedule={forecastSchedule} />
              )}
            </div>
          </>
        ) : (
          <div style={{ color: "#555" }}>
            Select a loan to view history and forecast.
          </div>
        )}
      </section>
    </div>
  );
}
