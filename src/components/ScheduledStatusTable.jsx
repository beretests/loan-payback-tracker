import { useMemo, useState } from "react";
import { money } from "../utils/format";

export default function ScheduledStatusTable({
  scheduledWithStatus,
  paidCount,
  partialCount,
  missedCount,
  pageSize = 18,
}) {
  const [page, setPage] = useState(1);
  const total = scheduledWithStatus.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return scheduledWithStatus.slice(start, start + pageSize);
  }, [safePage, pageSize, scheduledWithStatus]);

  const startRow = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(total, safePage * pageSize);

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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: "#555",
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div>
          Showing {startRow}-{endRow} of {total}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            Prev
          </button>
          <div>
            Page {safePage} of {totalPages}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
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
            {pageRows.map((s) => (
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
            {total === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 8, fontSize: 12, color: "#555" }}>
                  No scheduled payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
