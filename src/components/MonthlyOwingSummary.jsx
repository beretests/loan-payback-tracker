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
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 12,
          color: "#555",
          marginTop: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            background: "#f1f5ff",
            color: "#1b3a8a",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          Total scheduled: {money(totalScheduled)}
        </span>
        <span
          style={{
            fontWeight: 600,
            background: "#effaf3",
            color: "#1f6b3a",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          Total paid: {money(totalPaid)}
        </span>
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
