import { money } from "../utils/format";

export default function ScheduledStatusTable({
  scheduledWithStatus,
  paidCount,
  partialCount,
  missedCount,
}) {
  return (
    <div>
      <h3>Scheduled payment status</h3>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 12,
          color: "#555",
          marginBottom: 8,
        }}
      >
        <div>Paid: {paidCount}</div>
        <div>Partial: {partialCount}</div>
        <div>Missed: {missedCount}</div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Due", "Expected", "Paid in window", "Status", "Window"].map(
                (h) => (
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {scheduledWithStatus.slice(0, 18).map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {s.due_date}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(s.expected_amount)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(s.paid_in_window)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {s.status}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #eee",
                    fontSize: 12,
                    color: "#555",
                  }}
                >
                  [{s.window_from}, {s.window_to ?? "end"}]
                </td>
              </tr>
            ))}
            {scheduledWithStatus.length > 18 && (
              <tr>
                <td colSpan={5} style={{ padding: 8, fontSize: 12, color: "#555" }}>
                  Showing first 18 scheduled rows. (Easy to paginate later.)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
