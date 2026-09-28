import { describe, expect, it } from "vitest";
import {
  decimalToPercent,
  effectiveAnnualRate,
  percentToDecimal,
  validateDebtRate,
} from "./debtInterest";

describe("debt interest helpers", () => {
  it("calculates a variable APR from prime plus spread", () => {
    expect(
      effectiveAnnualRate({
        rateType: "variable",
        primeRatePct: "4.95",
        spreadPct: "2",
      }),
    ).toBeCloseTo(0.0695);
  });

  it("supports fixed and interest-free rates", () => {
    expect(
      effectiveAnnualRate({ rateType: "fixed", annualRatePct: "19.99" }),
    ).toBeCloseTo(0.1999);
    expect(effectiveAnnualRate({ rateType: "interest_free" })).toBe(0);
  });

  it("converts between percentages and decimals", () => {
    expect(percentToDecimal("6.5")).toBe(0.065);
    expect(decimalToPercent(0.065)).toBe("6.5");
  });

  it("requires the follow-on APR for a promotion", () => {
    expect(() =>
      validateDebtRate({
        debtId: "debt-1",
        effectiveDate: "2026-09-01",
        rateType: "fixed",
        annualRatePct: "0",
        isPromotional: true,
        promoEndsOn: "2027-01-01",
        postPromoAnnualRatePct: "",
      }),
    ).toThrow("APR that applies after");
  });
});
