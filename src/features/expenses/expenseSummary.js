export function expensesForMonth(expenses, month) {
  if (!month) return [];
  return expenses.filter(
    (expense) =>
      !expense.deleted_at && String(expense.spent_on).slice(0, 7) === month,
  );
}

export function summarizeExpenses(expenses, month) {
  const rows = expensesForMonth(expenses, month);
  const byCategory = new Map();

  for (const expense of rows) {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount)) continue;
    const category = expense.expense_categories?.name ?? "Uncategorized";
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
  }

  return {
    total: rows.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    count: rows.length,
    byCategory: Array.from(byCategory, ([name, amount]) => ({
      name,
      amount,
    })).sort((left, right) => right.amount - left.amount),
  };
}
