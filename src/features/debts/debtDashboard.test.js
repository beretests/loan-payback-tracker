import { describe, expect, it } from "vitest";
import { nextDueDate, summarizeDebts } from "./debtDashboard";

describe("debt dashboard", () => {
  it("sums balances, minimums, and estimated monthly interest", () => {
    expect(
      summarizeDebts([
        {
          currentBalance: 1000,
          minimum_payment: 100,
          currentAnnualRate: 0.12,
        },
        {
          currentBalance: 500,
          minimum_payment: 25,
          currentAnnualRate: 0.24,
        },
      ]),
    ).toEqual({
      totalDebt: 1500,
      minimumPayments: 125,
      monthlyInterest: 20,
    });
  });

  it("clamps a due day to the end of a short month", () => {
    expect(nextDueDate(31, "2026-02-01")).toBe("2026-02-28");
  });

  it("uses an assistance-adjusted minimum when present", () => {
    expect(
      summarizeDebts([
        {
          currentBalance: 1000,
          minimum_payment: 100,
          effectiveMinimumPayment: 25,
          currentAnnualRate: 0,
        },
      ]).minimumPayments,
    ).toBe(25);
  });

  it("rolls a passed due day into the next month", () => {
    expect(nextDueDate(5, "2026-09-20")).toBe("2026-10-05");
  });
});
