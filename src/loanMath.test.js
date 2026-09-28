import { describe, expect, it } from "vitest";
import {
  buildActualEventsFromPaymentEvents,
  buildActualEventsFromDebtLedger,
  buildScheduleFromActualEvents,
  calcMonthlyPayment,
  computeScheduledStatuses,
} from "./loanMath";

describe("loan math regressions", () => {
  it("calculates a zero-interest monthly payment", () => {
    expect(calcMonthlyPayment(1200, 0, 12)).toBe(100);
  });

  it("processes a same-day monthly payment before an extra payment", () => {
    const events = buildActualEventsFromPaymentEvents([
      { paid_date: "2026-08-29", amount: 25, kind: "extra" },
      { paid_date: "2026-08-29", amount: 100, kind: "monthly" },
    ]);

    expect(events.map((event) => event.type)).toEqual(["monthly", "extra"]);
  });

  it("adds posted interest to the debt before applying a payment", () => {
    const events = buildActualEventsFromDebtLedger(
      [{ paid_date: "2026-10-01", amount: 100, kind: "monthly" }],
      [
        {
          charged_on: "2026-09-30",
          amount: 20,
          charge_type: "interest",
          note: "Statement interest",
        },
      ],
    );
    const result = buildScheduleFromActualEvents({
      principal: 1000,
      startDate: "2026-09-01",
      ratePeriods: [{ date: new Date("2026-09-01T00:00:00Z"), annualRate: 0 }],
      dayCountBasis: 365,
      events,
    });

    expect(events.map((event) => event.type)).toEqual([
      "interest_charge",
      "monthly",
    ]);
    expect(result.totalInterest).toBe(20);
    expect(result.totalPaid).toBe(100);
    expect(result.endingBalance).toBe(920);
  });

  it("accrues a fee only from the day it is posted", () => {
    const events = buildActualEventsFromDebtLedger(
      [{ paid_date: "2026-10-01", amount: 100, kind: "monthly" }],
      [{ charged_on: "2026-09-16", amount: 10, charge_type: "fee" }],
    );
    const result = buildScheduleFromActualEvents({
      principal: 1000,
      startDate: "2026-09-01",
      ratePeriods: [
        { date: new Date("2026-09-01T00:00:00Z"), annualRate: 0.365 },
      ],
      dayCountBasis: 365,
      events,
    });

    expect(result.totalFees).toBe(10);
    expect(result.totalInterest).toBeCloseTo(30.15);
    expect(result.endingBalance).toBeCloseTo(940.15);
  });

  it("classifies scheduled payments using the grace window", () => {
    const [result] = computeScheduledStatuses({
      scheduledPayments: [
        { due_date: "2026-01-01", expected_amount: 100 },
      ],
      paymentEvents: [{ paid_date: "2026-01-10", amount: 40 }],
      todayDateUtc: "2026-02-01",
      graceDays: 15,
    });

    expect(result).toMatchObject({
      paid_in_window: 40,
      status: "partial",
      window_to: "2026-01-16",
    });
  });
});
