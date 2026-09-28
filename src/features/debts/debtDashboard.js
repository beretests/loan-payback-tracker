export function summarizeDebts(debts) {
  return debts.reduce(
    (summary, debt) => ({
      totalDebt: summary.totalDebt + Number(debt.currentBalance || 0),
      minimumPayments:
        summary.minimumPayments +
        Number(debt.effectiveMinimumPayment ?? debt.minimum_payment ?? 0),
      monthlyInterest:
        summary.monthlyInterest +
        (Number(debt.currentBalance || 0) *
          Number(debt.currentAnnualRate || 0)) /
          12,
    }),
    { totalDebt: 0, minimumPayments: 0, monthlyInterest: 0 },
  );
}

export function nextDueDate(dueDay, todayString) {
  const today = new Date(`${todayString}T00:00:00Z`);
  const candidate = dateForMonth(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    dueDay,
  );
  if (candidate >= today) return format(candidate);
  return format(
    dateForMonth(today.getUTCFullYear(), today.getUTCMonth() + 1, dueDay),
  );
}

function dateForMonth(year, monthIndex, dueDay) {
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      Math.min(dueDay, lastDay),
    ),
  );
}

function format(date) {
  return date.toISOString().slice(0, 10);
}
