export function buildCombinedSummary({
  availableAfterExpenses,
  minimumPayments,
  plannedDebtPayments,
}) {
  const available = Number(availableAfterExpenses || 0);
  const minimums = Number(minimumPayments || 0);
  const planned = Number(plannedDebtPayments || 0);
  return {
    safeExtraPayment: Math.max(0, available - minimums),
    cashAfterMinimums: available - minimums,
    exceedsAvailableCash: planned > Math.max(0, available),
    shortfall: Math.max(0, planned - available),
  };
}
