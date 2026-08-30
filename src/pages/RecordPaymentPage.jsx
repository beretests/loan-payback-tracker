import LoanSelector from "../components/LoanSelector";
import LumpSumPaymentForm from "../components/LumpSumPaymentForm";
import PaymentForm from "../components/PaymentForm";

export default function RecordPaymentPage({
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
  payDate,
  payAmount,
  payKind,
  payNote,
  onPayDateChange,
  onPayAmountChange,
  onPayKindChange,
  onPayNoteChange,
  onAddPayment,
  paymentLoading,
  onAddLumpSumPayment,
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
          currentUserId={currentUserId}
          shareEmail={shareEmail}
          shareLoading={shareLoading}
          shareError={shareError}
          onShareEmailChange={onShareEmailChange}
          onAddShare={onAddShare}
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

      <section className="panel">
        <LumpSumPaymentForm
          loans={loans}
          currentUserId={currentUserId}
          defaultDate={payDate}
          loading={paymentLoading}
          onAddLumpSumPayment={onAddLumpSumPayment}
        />
      </section>
    </div>
  );
}
