import { money } from "../utils/format";

export default function LoanSelector({
  loans,
  selectedLoanId,
  loan,
  ratePeriods,
  scheduled,
  events,
  onSelectLoan,
}) {
  return (
    <div>
      <h3>Select loan</h3>
      <select
        value={selectedLoanId}
        onChange={(e) => onSelectLoan(e.target.value)}
        style={{ width: "100%" }}
      >
        <option value="">-- Select --</option>
        {loans.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      {loan && (
        <div style={{ marginTop: 12, border: "1px solid #ddd", padding: 12 }}>
          <div>
            <strong>{loan.name}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Principal: {money(loan.principal)} | Start: {loan.start_date} |
            Fixed monthly: {money(loan.fixed_monthly_payment)}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Rates: {ratePeriods.length} | Scheduled payments:{" "}
            {scheduled.length} | Payment events: {events.length}
          </div>
        </div>
      )}
    </div>
  );
}
