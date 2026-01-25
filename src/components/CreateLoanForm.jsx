import { money, pct } from "../utils/format";

export default function CreateLoanForm({
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
    <div>
      <h3>Create a new loan</h3>
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
          Prime (%) (for initial rate)
          <input
            type="number"
            step="0.01"
            value={newPrimePct}
            onChange={(e) => onPrimePctChange(e.target.value)}
            placeholder="Prime (%) (for initial rate)"
            aria-label="Prime (%) (for initial rate)"
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 12, color: "#555" }}>
            Loan rate = prime - 0.25% = {pct(newLoanRateDecimal)}
          </div>
        </label>

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
        Create loan + schedule
      </button>
    </div>
  );
}
