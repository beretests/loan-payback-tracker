import { describe, expect, it } from "vitest";
import {
  buildInstallmentSchedule,
  summarizeInstallmentPlan,
} from "./installmentSchedule";

describe("installment schedules", () => {
  it("puts cent rounding into the final installment", () => {
    const schedule = buildInstallmentSchedule({
      totalAmount: 2097.37,
      installmentCount: 8,
      firstDueOn: "2026-09-11",
      frequency: "monthly",
    });
    expect(schedule).toHaveLength(8);
    expect(schedule[0]).toEqual({
      ordinal: 1,
      dueOn: "2026-09-11",
      amount: 262.17,
    });
    expect(schedule[7].amount).toBe(262.18);
    expect(schedule.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      2097.37,
    );
  });

  it("clamps monthly dates to the end of shorter months", () => {
    const schedule = buildInstallmentSchedule({
      totalAmount: 300,
      installmentCount: 3,
      firstDueOn: "2026-01-31",
      frequency: "monthly",
    });
    expect(schedule.map((item) => item.dueOn)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("summarizes only scheduled installments as outstanding", () => {
    expect(
      summarizeInstallmentPlan({
        expense_installments: [
          { status: "paid", amount: 25 },
          { status: "scheduled", amount: 25 },
          { status: "cancelled", amount: 25 },
        ],
      }),
    ).toEqual({
      paidCount: 1,
      remainingCount: 1,
      paidAmount: 25,
      outstandingAmount: 25,
    });
  });
});
