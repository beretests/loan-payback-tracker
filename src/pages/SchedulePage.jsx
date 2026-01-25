import LoanSelector from "../components/LoanSelector";
import ScheduledStatusTable from "../components/ScheduledStatusTable";

export default function SchedulePage({
  loans,
  selectedLoanId,
  loan,
  ratePeriods,
  scheduled,
  events,
  onSelectLoan,
  scheduledWithStatus,
  paidCount,
  partialCount,
  missedCount,
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
