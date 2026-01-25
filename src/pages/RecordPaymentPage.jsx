import LoanSelector from "../components/LoanSelector";
import PaymentForm from "../components/PaymentForm";

export default function RecordPaymentPage({
  loans,
  selectedLoanId,
  loan,
  ratePeriods,
  scheduled,
  events,
  onSelectLoan,
  payDate,
  payAmount,
  payKind,
  payNote,
  onPayDateChange,
  onPayAmountChange,
  onPayKindChange,
  onPayNoteChange,
  onAddPayment,
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
          <PaymentForm
            payDate={payDate}
            payAmount={payAmount}
            payKind={payKind}
            payNote={payNote}
            onPayDateChange={onPayDateChange}
            onPayAmountChange={onPayAmountChange}
            onPayKindChange={onPayKindChange}
            onPayNoteChange={onPayNoteChange}
            onAddPayment={onAddPayment}
          />
        ) : (
          <div style={{ color: "#555" }}>
            Select a loan to record a payment.
          </div>
        )}
      </section>
    </div>
  );
}
