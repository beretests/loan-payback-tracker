import { money } from "../utils/format";

export default function ForecastSection({ forecastSchedule }) {
  return (
    <div>
      <h3>Forecast</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Total paid (projected)
          </div>
          <div style={{ fontSize: 18 }}>
            {money(forecastSchedule.totalPaid)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Total interest (projected)
          </div>
          <div style={{ fontSize: 18 }}>
            {money(forecastSchedule.totalInterest)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>Ending balance</div>
          <div style={{ fontSize: 18 }}>
            {money(forecastSchedule.endingBalance)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Payoff date (projected)
          </div>
          <div style={{ fontSize: 18 }}>
            {forecastSchedule.payoffDate ?? "-"}
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #ddd", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Date",
                "Type",
                "Payment",
                "Interest accrued",
                "To interest",
                "To principal",
                "Balance",
              ].map((h) => (
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
            {forecastSchedule.rows.map((r, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {r.date}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {r.type}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.payment)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.interestAccrued)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.toInterest)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.toPrincipal)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.balance)}
                </td>
              </tr>
            ))}
            {!forecastSchedule.rows.length && (
              <tr>
                <td colSpan={7} style={{ padding: 8, color: "#555" }}>
                  No forecast rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
        Forecast includes recorded <strong>extra</strong> payments. If you want
        to plan future extras that you have not paid yet, we can add planned
        extra payments (separate table) without affecting actual history.
      </div>
    </div>
  );
}
