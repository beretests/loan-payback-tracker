import { money } from "../utils/format";

export default function MonthlyOwingSummary({
  month,
  rows,
  totalScheduled,
  totalPaid,
  loading,
  error,
  onMonthChange,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Monthly amount due</h3>
        <label style={{ fontSize: 12, color: "#555" }}>
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {error && (
        <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>
      )}
      {loading && (
        <div style={{ marginTop: 8, color: "#555" }}>
          Loading monthly totals...
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div className="metric-card metric-card--scheduled">
          <div className="metric-card__label">Total scheduled</div>
          <div className="metric-card__value">{money(totalScheduled)}</div>
        </div>
        <div className="metric-card metric-card--paid">
          <div className="metric-card__label">Total paid</div>
          <div className="metric-card__value">{money(totalPaid)}</div>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #ddd", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Loan", "Amount due", "Paid this month"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {row.name}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(row.amountDue)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(row.amountPaid)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 8, color: "#555" }}>
                  No loans to summarize yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
