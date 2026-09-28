import LoanSelector from "../components/LoanSelector";
import LumpSumPaymentForm from "../components/LumpSumPaymentForm";
import PaymentForm from "../components/PaymentForm";
import PageTaskBar from "../components/PageTaskBar";

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
      <PageTaskBar
        title="Record payment"
        tasks={[
          { target: "payment-debt", label: "Debt & sharing", action: "Select · invite" },
          { target: "single-payment", label: "Single payment", action: "Record" },
          { target: "lump-sum-payment", label: "Lump sum", action: "Allocate across debts" },
        ]}
      />
      <section className="panel" id="payment-debt">
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

      <section className="panel" id="single-payment">
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

      <section className="panel" id="lump-sum-payment">
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
