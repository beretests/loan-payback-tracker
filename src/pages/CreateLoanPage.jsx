import CreateLoanForm from "../components/CreateLoanForm";
import PageTaskBar from "../components/PageTaskBar";

export default function CreateLoanPage({
  newName,
  newPrincipal,
  newStartDate,
  newAmortMonths,
  newDayCount,
  newRateType,
  newAnnualRatePct,
  newPrimePct,
  newPrimeSpreadPct,
  newIsPromotional,
  newPromoEndsOn,
  newPostPromoRatePct,
  newMonthlyOverride,
  computedNewMonthly,
  newLoanRateDecimal,
  newDebtType,
  newMinimumPayment,
  newCreditLimit,
  newDueDay,
  onNameChange,
  onPrincipalChange,
  onStartDateChange,
  onAmortMonthsChange,
  onDayCountChange,
  onRateTypeChange,
  onAnnualRatePctChange,
  onPrimePctChange,
  onPrimeSpreadPctChange,
  onIsPromotionalChange,
  onPromoEndsOnChange,
  onPostPromoRatePctChange,
  onMonthlyOverrideChange,
  onDebtTypeChange,
  onMinimumPaymentChange,
  onCreditLimitChange,
  onDueDayChange,
  onCreateLoan,
}) {
  return (
    <div className="page-stack">
      <PageTaskBar
        title="Create debt"
        tasks={[
          { target: "create-debt", label: "New debt", action: "Create debt · schedule" },
        ]}
      />
      <section className="panel" id="create-debt">
        <CreateLoanForm
          newName={newName}
          newPrincipal={newPrincipal}
          newStartDate={newStartDate}
          newAmortMonths={newAmortMonths}
          newDayCount={newDayCount}
          newRateType={newRateType}
          newAnnualRatePct={newAnnualRatePct}
          newPrimePct={newPrimePct}
          newPrimeSpreadPct={newPrimeSpreadPct}
          newIsPromotional={newIsPromotional}
          newPromoEndsOn={newPromoEndsOn}
          newPostPromoRatePct={newPostPromoRatePct}
          newMonthlyOverride={newMonthlyOverride}
          computedNewMonthly={computedNewMonthly}
          newLoanRateDecimal={newLoanRateDecimal}
          newDebtType={newDebtType}
          newMinimumPayment={newMinimumPayment}
          newCreditLimit={newCreditLimit}
          newDueDay={newDueDay}
          onNameChange={onNameChange}
          onPrincipalChange={onPrincipalChange}
          onStartDateChange={onStartDateChange}
          onAmortMonthsChange={onAmortMonthsChange}
          onDayCountChange={onDayCountChange}
          onRateTypeChange={onRateTypeChange}
          onAnnualRatePctChange={onAnnualRatePctChange}
          onPrimePctChange={onPrimePctChange}
          onPrimeSpreadPctChange={onPrimeSpreadPctChange}
          onIsPromotionalChange={onIsPromotionalChange}
          onPromoEndsOnChange={onPromoEndsOnChange}
          onPostPromoRatePctChange={onPostPromoRatePctChange}
          onMonthlyOverrideChange={onMonthlyOverrideChange}
          onDebtTypeChange={onDebtTypeChange}
          onMinimumPaymentChange={onMinimumPaymentChange}
          onCreditLimitChange={onCreditLimitChange}
          onDueDayChange={onDueDayChange}
          onCreateLoan={onCreateLoan}
        />
      </section>
    </div>
  );
}
