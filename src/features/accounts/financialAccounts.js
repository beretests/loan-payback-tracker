export const ACCOUNT_TYPES = [
  ["bank_account", "Bank account"],
  ["debit_card", "Debit card"],
  ["credit_card", "Credit card"],
  ["line_of_credit", "Line of credit"],
  ["cash", "Cash"],
  ["other", "Other"],
];

export const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["debit_card", "Debit card"],
  ["credit_card", "Credit card"],
  ["line_of_credit", "Line of credit"],
  ["bank_transfer", "Bank transfer"],
  ["other", "Other"],
];

const ACCOUNT_TYPE_LABELS = Object.fromEntries(ACCOUNT_TYPES);
const PAYMENT_METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS);

export function accountTypeLabel(type) {
  return ACCOUNT_TYPE_LABELS[type] ?? "Other";
}

export function financialAccountLabel(account) {
  if (!account) return "";
  const suffix = account.last_four ? ` •••• ${account.last_four}` : "";
  return `${account.name}${suffix}`;
}

export function paymentMethodForAccountType(type) {
  if (type === "bank_account") return "bank_transfer";
  if (["cash", "debit_card", "credit_card", "line_of_credit"].includes(type)) {
    return type;
  }
  return "other";
}

export function paymentSourceLabel(expense) {
  return (
    financialAccountLabel(expense.financial_accounts) ||
    PAYMENT_METHOD_LABELS[expense.payment_method] ||
    "Other"
  );
}

export function summarizeByPaymentSource(expenses, month) {
  const totals = new Map();
  for (const expense of expenses) {
    if (
      expense.deleted_at ||
      String(expense.spent_on).slice(0, 7) !== month
    ) {
      continue;
    }
    const name = paymentSourceLabel(expense);
    totals.set(name, (totals.get(name) ?? 0) + Number(expense.amount || 0));
  }
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
}
