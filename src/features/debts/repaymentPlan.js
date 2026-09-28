import {
  isInterestFreeOnDate,
  requiredPaymentForDate,
} from "./studentLoanAssistance";

const MAX_MONTHS = 1200;

export function buildRepaymentPlan({
  debts,
  extraMonthly = 0,
  strategy = "avalanche",
  startMonth,
}) {
  const active = debts
    .map((debt) => {
      const minimum = cents(Number(debt.minimum_payment || 0));
      return {
        id: debt.id,
        name: debt.name,
        balance: cents(Number(debt.currentBalance || 0)),
        annualRate: Number(
          debt.baseCurrentAnnualRate ?? debt.currentAnnualRate ?? 0,
        ),
        baseAnnualRate: Number(
          debt.baseCurrentAnnualRate ?? debt.currentAnnualRate ?? 0,
        ),
        minimum,
        minimum_payment: minimum,
        debt_assistance_periods: debt.debt_assistance_periods ?? [],
      };
    })
    .filter((debt) => debt.balance > 0);
  if (!active.length) {
    return { months: 0, payoffDate: null, totalInterest: 0, payoffOrder: [] };
  }

  const monthlyBudget =
    active.reduce((sum, debt) => sum + debt.minimum, 0) +
    Math.max(0, cents(Number(extraMonthly || 0)));
  if (monthlyBudget <= 0) {
    return incomplete();
  }

  let totalInterest = 0;
  const payoffOrder = [];

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    const monthDate = `${addMonths(startMonth, month - 1)}-01`;
    for (const debt of active) {
      if (debt.balance <= 0) continue;
      debt.annualRate = isInterestFreeOnDate(
        debt.debt_assistance_periods,
        monthDate,
      )
        ? 0
        : debt.baseAnnualRate;
      const interest = cents(debt.balance * (debt.annualRate / 12));
      debt.balance = cents(debt.balance + interest);
      totalInterest = cents(totalInterest + interest);
    }

    const assistanceReduction = active.reduce((sum, debt) => {
      if (debt.balance <= 0) return sum;
      const required = requiredPaymentForDate(debt, monthDate);
      return sum + Math.max(0, debt.minimum - cents(required));
    }, 0);
    let remaining = cents(monthlyBudget - assistanceReduction);
    for (const debt of active) {
      if (debt.balance <= 0) continue;
      const required = cents(requiredPaymentForDate(debt, monthDate));
      const payment = Math.min(required, debt.balance, remaining);
      debt.balance = cents(debt.balance - payment);
      remaining = cents(remaining - payment);
    }

    for (const debt of ordered(active, strategy)) {
      if (remaining <= 0) break;
      const payment = Math.min(debt.balance, remaining);
      debt.balance = cents(debt.balance - payment);
      remaining = cents(remaining - payment);
    }

    for (const debt of active) {
      if (debt.balance === 0 && !payoffOrder.includes(debt.name)) {
        payoffOrder.push(debt.name);
      }
    }

    if (active.every((debt) => debt.balance === 0)) {
      return {
        months: month,
        payoffDate: addMonths(startMonth, month),
        totalInterest,
        payoffOrder,
      };
    }
  }

  return incomplete(totalInterest, payoffOrder);
}

function ordered(debts, strategy) {
  return debts
    .filter((debt) => debt.balance > 0)
    .sort((left, right) => {
      if (strategy === "snowball") {
        return left.balance - right.balance || right.annualRate - left.annualRate;
      }
      return right.annualRate - left.annualRate || left.balance - right.balance;
    });
}

function addMonths(startMonth, months) {
  const [year, month] = startMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1))
    .toISOString()
    .slice(0, 7);
}

function cents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function incomplete(totalInterest = 0, payoffOrder = []) {
  return {
    months: null,
    payoffDate: null,
    totalInterest,
    payoffOrder,
  };
}
