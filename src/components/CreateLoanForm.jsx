import { money, pct } from "../utils/format";

export default function CreateLoanForm({
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
    <div>
      <h3>Create a new debt</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <label>
          Name
          <input
            value={newName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name"
            aria-label="Name"
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Debt type
          <select
            value={newDebtType}
            onChange={(e) => onDebtTypeChange(e.target.value)}
          >
            <option value="personal_loan">Personal loan</option>
            <option value="student_loan">Student loan</option>
            <option value="credit_card">Credit card</option>
            <option value="line_of_credit">Line of credit</option>
            <option value="mortgage">Mortgage</option>
            <option value="informal_debt">Informal debt</option>
          </select>
        </label>
        <label>
          Principal (CAD)
          <input
            type="number"
            value={newPrincipal}
            onChange={(e) => onPrincipalChange(e.target.value)}
            placeholder="Principal (CAD)"
            aria-label="Principal (CAD)"
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Minimum monthly payment
          <input
            type="number"
            min="0"
            step="0.01"
            value={newMinimumPayment}
            onChange={(e) => onMinimumPaymentChange(e.target.value)}
            placeholder="Defaults to calculated payment"
          />
        </label>
        <label>
          Credit limit (optional)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={newCreditLimit}
            onChange={(e) => onCreditLimitChange(e.target.value)}
          />
        </label>
        <label>
          Payment due day
          <input
            type="number"
            min="1"
            max="31"
            value={newDueDay}
            onChange={(e) => onDueDayChange(e.target.value)}
            required
          />
        </label>
        <label>
          Start date
          <input
            type="date"
            value={newStartDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            placeholder="Start date"
            aria-label="Start date"
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Amortization (months)
          <input
            type="number"
            value={newAmortMonths}
            onChange={(e) => onAmortMonthsChange(e.target.value)}
            placeholder="Amortization (months)"
            aria-label="Amortization (months)"
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Day-count basis
          <select
            value={newDayCount}
            onChange={(e) => onDayCountChange(e.target.value)}
            aria-label="Day-count basis"
            style={{ width: "100%" }}
          >
            <option value="">Day-count basis</option>
            <option value="365">Day-count basis: 365</option>
            <option value="360">Day-count basis: 360</option>
          </select>
        </label>

        <label>
          Rate type
          <select
            value={newRateType}
            onChange={(e) => onRateTypeChange(e.target.value)}
          >
            <option value="fixed">Fixed APR</option>
            <option value="variable">Variable — prime + spread</option>
            <option value="interest_free">Interest-free</option>
          </select>
        </label>

        {newRateType === "fixed" && (
          <label>
            APR (%)
            <input
              type="number"
              min="0"
              step="0.001"
              value={newAnnualRatePct}
              onChange={(e) => onAnnualRatePctChange(e.target.value)}
              required
            />
          </label>
        )}

        {newRateType === "variable" && (
          <>
            <label>
              Prime rate (%)
              <input
                type="number"
                min="0"
                step="0.001"
                value={newPrimePct}
                onChange={(e) => onPrimePctChange(e.target.value)}
                required
              />
            </label>
            <label>
              Spread (%)
              <input
                type="number"
                step="0.001"
                value={newPrimeSpreadPct}
                onChange={(e) => onPrimeSpreadPctChange(e.target.value)}
                placeholder="For example, 2 or -0.25"
                required
              />
            </label>
          </>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newIsPromotional}
            onChange={(e) => onIsPromotionalChange(e.target.checked)}
          />
          Promotional rate
        </label>

        {newIsPromotional && (
          <>
            <label>
              Promotion ends
              <input
                type="date"
                value={newPromoEndsOn}
                onChange={(e) => onPromoEndsOnChange(e.target.value)}
                required
              />
            </label>
            <label>
              APR after promotion (%)
              <input
                type="number"
                min="0"
                step="0.001"
                value={newPostPromoRatePct}
                onChange={(e) => onPostPromoRatePctChange(e.target.value)}
                required
              />
            </label>
          </>
        )}

        <div className="form-help">
          Initial effective APR: {pct(newLoanRateDecimal)}
        </div>

        <label>
          Fixed monthly payment override (optional)
          <input
            type="number"
            value={newMonthlyOverride}
            onChange={(e) => onMonthlyOverrideChange(e.target.value)}
            placeholder={
              isFinite(computedNewMonthly) ? computedNewMonthly.toFixed(2) : ""
            }
            aria-label="Fixed monthly payment override (optional)"
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 12, color: "#555" }}>
            Computed monthly payment: {money(computedNewMonthly)}
          </div>
        </label>
      </div>

      <button onClick={onCreateLoan} style={{ marginTop: 10 }}>
        Create debt + schedule
      </button>
    </div>
  );
}
