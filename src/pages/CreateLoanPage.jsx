import CreateLoanForm from "../components/CreateLoanForm";

export default function CreateLoanPage({
  newName,
  newPrincipal,
  newStartDate,
  newAmortMonths,
  newDayCount,
  newPrimePct,
  newMonthlyOverride,
  computedNewMonthly,
  newLoanRateDecimal,
  onNameChange,
  onPrincipalChange,
  onStartDateChange,
  onAmortMonthsChange,
  onDayCountChange,
  onPrimePctChange,
  onMonthlyOverrideChange,
  onCreateLoan,
}) {
  return (
    <div className="page-stack">
      <section className="panel">
        <CreateLoanForm
          newName={newName}
          newPrincipal={newPrincipal}
          newStartDate={newStartDate}
          newAmortMonths={newAmortMonths}
          newDayCount={newDayCount}
          newPrimePct={newPrimePct}
          newMonthlyOverride={newMonthlyOverride}
          computedNewMonthly={computedNewMonthly}
          newLoanRateDecimal={newLoanRateDecimal}
          onNameChange={onNameChange}
          onPrincipalChange={onPrincipalChange}
          onStartDateChange={onStartDateChange}
          onAmortMonthsChange={onAmortMonthsChange}
          onDayCountChange={onDayCountChange}
          onPrimePctChange={onPrimePctChange}
          onMonthlyOverrideChange={onMonthlyOverrideChange}
          onCreateLoan={onCreateLoan}
        />
      </section>
    </div>
  );
}
