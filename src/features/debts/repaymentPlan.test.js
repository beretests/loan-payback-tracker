import { describe, expect, it } from "vitest";
import { buildRepaymentPlan } from "./repaymentPlan";

const debts = [
  {
    id: "small",
    name: "Small card",
    currentBalance: 500,
    currentAnnualRate: 0.12,
    minimum_payment: 50,
  },
  {
    id: "expensive",
    name: "High-rate card",
    currentBalance: 2000,
    currentAnnualRate: 0.24,
    minimum_payment: 100,
  },
];

describe("buildRepaymentPlan", () => {
  it("targets the smallest balance first for snowball", () => {
    const plan = buildRepaymentPlan({
      debts,
      extraMonthly: 200,
      strategy: "snowball",
      startMonth: "2026-09",
    });
    expect(plan.payoffOrder[0]).toBe("Small card");
    expect(plan.payoffDate).toMatch(/^2027-/);
  });

  it("reduces interest with avalanche for this portfolio", () => {
    const avalanche = buildRepaymentPlan({
      debts,
      extraMonthly: 200,
      strategy: "avalanche",
      startMonth: "2026-09",
    });
    const snowball = buildRepaymentPlan({
      debts,
      extraMonthly: 200,
      strategy: "snowball",
      startMonth: "2026-09",
    });
    expect(avalanche.totalInterest).toBeLessThan(snowball.totalInterest);
  });

  it("uses extra cash to shorten the forecast", () => {
    const minimumOnly = buildRepaymentPlan({
      debts,
      strategy: "avalanche",
      startMonth: "2026-09",
    });
    const accelerated = buildRepaymentPlan({
      debts,
      extraMonthly: 300,
      strategy: "avalanche",
      startMonth: "2026-09",
    });
    expect(accelerated.months).toBeLessThan(minimumOnly.months);
  });

  it("does not accrue interest during a student-loan interest-free period", () => {
    const studentDebt = {
      id: "student",
      name: "Student loan",
      currentBalance: 1200,
      currentAnnualRate: 0.12,
      baseCurrentAnnualRate: 0.12,
      minimum_payment: 100,
      debt_assistance_periods: [
        {
          assistance_type: "interest_free",
          starts_on: "2026-09-01",
          ends_on: "2027-08-31",
        },
      ],
    };
    const assisted = buildRepaymentPlan({
      debts: [studentDebt],
      startMonth: "2026-09",
    });
    const regular = buildRepaymentPlan({
      debts: [{ ...studentDebt, debt_assistance_periods: [] }],
      startMonth: "2026-09",
    });
    expect(assisted.totalInterest).toBe(0);
    expect(assisted.months).toBeLessThan(regular.months);
  });

  it("uses a reduced required payment during assistance", () => {
    const debt = {
      id: "student",
      name: "Student loan",
      currentBalance: 600,
      currentAnnualRate: 0,
      minimum_payment: 100,
      debt_assistance_periods: [
        {
          assistance_type: "reduced_payment",
          starts_on: "2026-09-01",
          ends_on: "2026-11-30",
          required_payment: 50,
        },
      ],
    };
    const assisted = buildRepaymentPlan({
      debts: [debt],
      startMonth: "2026-09",
    });
    const regular = buildRepaymentPlan({
      debts: [{ ...debt, debt_assistance_periods: [] }],
      startMonth: "2026-09",
    });
    expect(assisted.months).toBeGreaterThan(regular.months);
  });
});
