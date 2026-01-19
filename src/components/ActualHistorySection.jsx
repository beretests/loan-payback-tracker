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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>Total paid</div>
          <div style={{ fontSize: 18 }}>{money(actualSchedule.totalPaid)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Total interest (accrued between payments)
          </div>
          <div style={{ fontSize: 18 }}>
            {money(actualSchedule.totalInterest)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Ending balance (after last recorded payment)
          </div>
          <div style={{ fontSize: 18 }}>
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

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #ddd",
          marginTop: 8,
        }}
      >
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
                "Actions",
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
            {actualSchedule.rows.map((r, idx) => (
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
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #eee",
                    fontSize: 12,
                    color: "#555",
                  }}
                >
                  <span>See "Payment events" below</span>
                </td>
              </tr>
            ))}
            {!actualSchedule.rows.length && (
              <tr>
                <td colSpan={8} style={{ padding: 8, color: "#555" }}>
                  No recorded payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: 14 }}>Payment events (raw)</h4>
      <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Paid date", "Amount", "Kind", "Note", "Actions"].map((h) => (
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
            {events.map((ev) => (
              <tr key={ev.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {ev.paid_date}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(ev.amount)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {ev.kind}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {ev.note ?? ""}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
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
                <td colSpan={5} style={{ padding: 8, color: "#555" }}>
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
