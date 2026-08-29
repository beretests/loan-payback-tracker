import { money } from "../utils/format";

export default function LoanSelector({
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

      {loan && currentUserId && loan.user_id === currentUserId && (
        <div
          style={{
            marginTop: 12,
            border: "1px dashed #cbd3df",
            background: "#f8fafc",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#556075", marginBottom: 6 }}>
            Invite viewer (read-only)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => onShareEmailChange(e.target.value)}
              placeholder="viewer@example.com"
              aria-label="Invite viewer email"
              style={{ flex: "1 1 220px" }}
            />
            <button onClick={onAddShare} disabled={shareLoading}>
              {shareLoading ? "Inviting..." : "Invite"}
            </button>
          </div>
          {shareError && (
            <div style={{ marginTop: 6, color: "crimson", fontSize: 12 }}>
              {shareError}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 12, color: "#556075" }}>
            Invited users can view this loan and its payments, but cannot edit.
          </div>
        </div>
      )}
    </div>
  );
}
