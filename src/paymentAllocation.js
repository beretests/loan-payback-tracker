function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100);
}

export function allocateLumpSumPayment({
  amount,
  selectedLoans,
  extraLoanId,
}) {
  const amountCents = toCents(amount);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Lump-sum amount must be greater than 0.");
  }

  const uniqueLoans = [];
  const seenLoanIds = new Set();
  for (const loan of selectedLoans ?? []) {
    if (!loan?.id || seenLoanIds.has(loan.id)) continue;
    const scheduledCents = toCents(loan.fixed_monthly_payment);
    if (!Number.isSafeInteger(scheduledCents) || scheduledCents < 0) {
      throw new Error(`${loan.name ?? "Selected loan"} has an invalid monthly payment.`);
    }
    seenLoanIds.add(loan.id);
    uniqueLoans.push({
      loanId: loan.id,
      loanName: loan.name ?? "Unnamed loan",
      scheduledCents,
    });
  }

  if (!uniqueLoans.length) {
    throw new Error("Select at least one loan.");
  }

  const scheduledTotalCents = uniqueLoans.reduce(
    (sum, loan) => sum + loan.scheduledCents,
    0,
  );
  const regularBudgetCents = Math.min(amountCents, scheduledTotalCents);

  let allocations = uniqueLoans.map((loan) => ({
    ...loan,
    allocatedCents: loan.scheduledCents,
    fraction: 0,
  }));

  if (regularBudgetCents < scheduledTotalCents && scheduledTotalCents > 0) {
    allocations = uniqueLoans.map((loan) => {
      const exact =
        (regularBudgetCents * loan.scheduledCents) / scheduledTotalCents;
      return {
        ...loan,
        allocatedCents: Math.floor(exact),
        fraction: exact - Math.floor(exact),
      };
    });

    let centsLeft =
      regularBudgetCents -
      allocations.reduce((sum, loan) => sum + loan.allocatedCents, 0);
    const remainderOrder = [...allocations].sort(
      (a, b) => b.fraction - a.fraction,
    );
    for (let index = 0; centsLeft > 0; index += 1, centsLeft -= 1) {
      remainderOrder[index % remainderOrder.length].allocatedCents += 1;
    }
  }

  const regularAllocations = allocations
    .filter((loan) => loan.allocatedCents > 0)
    .map((loan) => ({
      loanId: loan.loanId,
      loanName: loan.loanName,
      amount: loan.allocatedCents / 100,
    }));

  const extraCents = Math.max(0, amountCents - scheduledTotalCents);
  let extraAllocation = null;
  if (extraCents > 0) {
    const extraLoan = uniqueLoans.find((loan) => loan.loanId === extraLoanId);
    if (!extraLoan) {
      throw new Error("Choose a selected loan for the extra payment.");
    }
    extraAllocation = {
      loanId: extraLoan.loanId,
      loanName: extraLoan.loanName,
      amount: extraCents / 100,
    };
  }

  return {
    regularAllocations,
    extraAllocation,
    scheduledTotal: scheduledTotalCents / 100,
    totalAllocated: amountCents / 100,
  };
}
