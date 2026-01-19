function toDateOnly(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addMonthsUTC(d, months) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const nd = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(
    Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() + 1, 0)
  ).getUTCDate();
  nd.setUTCDate(Math.min(day, lastDay));
  return nd;
}

export function buildScheduledPayments(startDate, amortMonths, expectedAmount) {
  const start = toDateOnly(startDate);
  const rows = [];
  for (let i = 1; i <= amortMonths; i++) {
    rows.push({
      due_date: fmtDate(addMonthsUTC(start, i)),
      expected_amount: Number(expectedAmount),
    });
  }
  return rows;
}
