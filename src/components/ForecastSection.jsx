import { money } from "../utils/format";

export default function ForecastSection({ forecastSchedule }) {
  return (
    <div>
      <h3>Forecast</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div className="metric-card">
          <div className="metric-card__label">Total paid (projected)</div>
          <div className="metric-card__value">
            {money(forecastSchedule.totalPaid)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Total interest (projected)</div>
          <div className="metric-card__value">
            {money(forecastSchedule.totalInterest)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Ending balance</div>
          <div className="metric-card__value">
            {money(forecastSchedule.endingBalance)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Payoff date (projected)</div>
          <div className="metric-card__value">
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
