function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addMonthsClamped(value, months) {
  const source = parseDate(value);
  const first = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return formatDate(first);
}

function addDays(value, days) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

export function buildInstallmentSchedule({
  totalAmount,
  installmentCount,
  firstDueOn,
  frequency,
}) {
  const totalCents = Math.round(Number(totalAmount) * 100);
  const count = Number(installmentCount);
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Plan total must be greater than zero.");
  }
  if (!Number.isInteger(count) || count < 2 || count > 240) {
    throw new Error("Installment count must be between 2 and 240.");
  }
  if (!firstDueOn) throw new Error("First due date is required.");
  if (!["weekly", "biweekly", "monthly"].includes(frequency)) {
    throw new Error("Choose a supported frequency.");
  }

  const regularCents = Math.floor(totalCents / count);
  if (regularCents <= 0) {
    throw new Error("Each installment must be at least one cent.");
  }
  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const amountCents = isLast
      ? totalCents - regularCents * (count - 1)
      : regularCents;
    const dueOn =
      frequency === "monthly"
        ? addMonthsClamped(firstDueOn, index)
        : addDays(firstDueOn, index * (frequency === "weekly" ? 7 : 14));
    return {
      ordinal: index + 1,
      dueOn,
      amount: amountCents / 100,
    };
  });
}

export function summarizeInstallmentPlan(plan) {
  const installments = plan.expense_installments ?? [];
  const paid = installments.filter((item) => item.status === "paid");
  const scheduled = installments.filter((item) => item.status === "scheduled");
  return {
    paidCount: paid.length,
    remainingCount: scheduled.length,
    paidAmount: paid.reduce((sum, item) => sum + Number(item.amount), 0),
    outstandingAmount: scheduled.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    ),
  };
}
