import LoanSelector from "../components/LoanSelector";
import ScheduledStatusTable from "../components/ScheduledStatusTable";
import PageTaskBar from "../components/PageTaskBar";

export default function SchedulePage({
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
  scheduledWithStatus,
  paidCount,
  partialCount,
  missedCount,
}) {
  return (
    <div className="page-stack">
      <PageTaskBar
        title="Payment schedule"
        tasks={[
          { target: "schedule-debt", label: "Debt & sharing", action: "Select · invite" },
          { target: "schedule-status", label: "Schedule status", action: "View paid · partial · missed" },
        ]}
      />
      <section className="panel" id="schedule-debt">
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

      <section className="panel" id="schedule-status">
        {loan ? (
          <ScheduledStatusTable
            scheduledWithStatus={scheduledWithStatus}
            paidCount={paidCount}
            partialCount={partialCount}
            missedCount={missedCount}
          />
        ) : (
          <div style={{ color: "#555" }}>
            Select a loan to view the schedule.
          </div>
        )}
      </section>
    </div>
  );
}
