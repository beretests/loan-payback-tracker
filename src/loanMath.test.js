import { describe, expect, it } from "vitest";
import {
  buildActualEventsFromPaymentEvents,
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
