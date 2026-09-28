import LoanSelector from "../components/LoanSelector";
import TabSwitcher from "../components/TabSwitcher";
import ActualHistorySection from "../components/ActualHistorySection";
import ForecastSection from "../components/ForecastSection";
import PageTaskBar from "../components/PageTaskBar";

export default function HistoryForecastPage({
  loans,
  selectedLoanId,
  loan,
  ratePeriods,
  scheduled,
  events,
  onSelectLoan,
  currentUserId,
  shareEmail,
  shareLoading,
  shareError,
  onShareEmailChange,
  onAddShare,
  tab,
  onTabChange,
  actualSchedule,
  forecastSchedule,
  onExportCSV,
  onDeleteEvent,
}) {
  return (
    <div className="page-stack">
      <PageTaskBar
        title="History and forecast"
        tasks={[
          { target: "history-debt", label: "Debt & sharing", action: "Select · invite" },
          { target: "history-forecast", label: "Actual history", action: "View · export · delete", onSelect: () => onTabChange("actual") },
          { target: "history-forecast", label: "Forecast", action: "View projection", onSelect: () => onTabChange("forecast") },
        ]}
      />
      <section className="panel" id="history-debt">
        <LoanSelector
          loans={loans}
          selectedLoanId={selectedLoanId}
          loan={loan}
          ratePeriods={ratePeriods}
          scheduled={scheduled}
          events={events}
          onSelectLoan={onSelectLoan}
          currentUserId={currentUserId}
          shareEmail={shareEmail}
          shareLoading={shareLoading}
          shareError={shareError}
          onShareEmailChange={onShareEmailChange}
          onAddShare={onAddShare}
        />
      </section>

      <section className="panel" id="history-forecast">
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
