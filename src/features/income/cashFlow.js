export function summarizeCashFlow(incomeEntries, expenses, month) {
  const income = incomeEntries
    .filter(
      (entry) =>
        !entry.deleted_at && String(entry.received_on).slice(0, 7) === month,
    )
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const spending = expenses
    .filter(
      (expense) =>
        !expense.deleted_at && String(expense.spent_on).slice(0, 7) === month,
    )
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return { income, spending, available: income - spending };
}
