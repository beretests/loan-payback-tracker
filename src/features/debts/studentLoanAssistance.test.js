import { describe, expect, it } from "vitest";
import {
  applyInterestFreePeriods,
  assistanceIsActive,
  rateForDate,
  requiredPaymentForDate,
} from "./studentLoanAssistance";

const assistance = [
  {
    assistance_type: "interest_free",
    starts_on: "2026-09-15",
    ends_on: "2027-01-31",
  },
];

describe("student-loan assistance", () => {
  it("treats period boundaries as inclusive", () => {
    expect(assistanceIsActive(assistance[0], "2026-09-15")).toBe(true);
    expect(assistanceIsActive(assistance[0], "2027-01-31")).toBe(true);
    expect(assistanceIsActive(assistance[0], "2027-02-01")).toBe(false);
  });

  it("sets interest to zero only during the assistance period", () => {
    const rates = applyInterestFreePeriods(
      [{ date: new Date("2026-01-01T00:00:00Z"), annualRate: 0.07 }],
      assistance,
      "2026-01-01",
    );
    expect(rateForDate(rates, "2026-09-14")).toBe(0.07);
    expect(rateForDate(rates, "2026-09-15")).toBe(0);
    expect(rateForDate(rates, "2027-02-01")).toBe(0.07);
  });

  it("restores a rate change made during an interest-free period", () => {
    const rates = applyInterestFreePeriods(
      [
        { date: new Date("2026-01-01T00:00:00Z"), annualRate: 0.07 },
        { date: new Date("2026-12-01T00:00:00Z"), annualRate: 0.08 },
      ],
      assistance,
      "2026-01-01",
    );
    expect(rateForDate(rates, "2026-12-15")).toBe(0);
    expect(rateForDate(rates, "2027-02-01")).toBe(0.08);
  });

  it("applies payment pauses before reduced-payment rules", () => {
    const debt = {
      minimum_payment: 200,
      debt_assistance_periods: [
        {
          assistance_type: "reduced_payment",
          starts_on: "2026-09-01",
          ends_on: null,
          required_payment: 75,
        },
        {
          assistance_type: "payment_pause",
          starts_on: "2026-10-01",
          ends_on: "2026-10-31",
        },
      ],
    };
    expect(requiredPaymentForDate(debt, "2026-09-15")).toBe(75);
    expect(requiredPaymentForDate(debt, "2026-10-15")).toBe(0);
    expect(requiredPaymentForDate(debt, "2026-08-15")).toBe(200);
  });

  it("preserves a supplied scheduled amount outside assistance", () => {
    expect(
      requiredPaymentForDate(
        { minimum_payment: 75, debt_assistance_periods: [] },
        "2026-09-15",
        125,
      ),
    ).toBe(125);
  });
});
