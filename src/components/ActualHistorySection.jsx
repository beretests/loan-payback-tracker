import { money } from "../utils/format";

export default function ActualHistorySection({
  actualSchedule,
  events,
  onExportCSV,
  onDeleteEvent,
}) {
  return (
    <div>
      <h3>Actual payment history</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div className="metric-card">
          <div className="metric-card__label">Total paid</div>
          <div className="metric-card__value">
            {money(actualSchedule.totalPaid)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">
            Total interest (accrued between payments)
          </div>
          <div className="metric-card__value">
            {money(actualSchedule.totalInterest)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">
            Ending balance (after last recorded payment)
          </div>
          <div className="metric-card__value">
            {money(actualSchedule.endingBalance)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>Computed schedule from recorded payments</h4>
        <button
          onClick={onExportCSV}
          disabled={!actualSchedule.rows.length}
          style={{
            fontSize: 12,
            padding: "4px 8px",
            cursor: actualSchedule.rows.length ? "pointer" : "not-allowed",
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data-table">
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
                "Actions",
              ].map((h) => (
                  <th key={h} className="data-table__head">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {actualSchedule.rows.map((r, idx) => (
              <tr key={idx}>
                <td>
                  {r.date}
                </td>
                <td>
                  {r.type}
                </td>
                <td>
                  {money(r.payment)}
                </td>
                <td>
                  {money(r.interestAccrued)}
                </td>
                <td>
                  {money(r.toInterest)}
                </td>
                <td>
                  {money(r.toPrincipal)}
                </td>
                <td>
                  {money(r.balance)}
                </td>
                <td className="data-table__muted">
                  <span>See "Payment events" below</span>
                </td>
              </tr>
            ))}
            {!actualSchedule.rows.length && (
              <tr>
                <td colSpan={8} className="data-table__empty">
                  No recorded payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: 14 }}>Payment events (raw)</h4>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {["Paid date", "Amount", "Kind", "Note", "Actions"].map((h) => (
                <th
                  key={h}
                  className="data-table__head"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>
                  {ev.paid_date}
                </td>
                <td>
                  {money(ev.amount)}
                </td>
                <td>
                  {ev.kind}
                </td>
                <td>
                  {ev.note ?? ""}
                </td>
                <td>
                  <button
                    onClick={() => onDeleteEvent(ev.id)}
                    style={{ fontSize: 12 }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!events.length && (
              <tr>
                <td colSpan={5} className="data-table__empty">
                  No payment events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
        Note: Payments count for the month if paid within 15 days after the due
        date. Missed is assessed after the grace window ends.
      </div>
    </div>
  );
}
