import { describe, expect, it } from "vitest";
import { buildCombinedSummary } from "./combinedDashboard";

describe("buildCombinedSummary", () => {
  it("reserves minimums before recommending an extra payment", () => {
    expect(
      buildCombinedSummary({
        availableAfterExpenses: 1000,
        minimumPayments: 600,
        plannedDebtPayments: 600,
      }),
    ).toEqual({
      safeExtraPayment: 400,
      cashAfterMinimums: 400,
      exceedsAvailableCash: false,
      shortfall: 0,
    });
  });

  it("warns when planned debt payments exceed available cash", () => {
    const result = buildCombinedSummary({
      availableAfterExpenses: 300,
      minimumPayments: 500,
      plannedDebtPayments: 550,
    });
    expect(result.exceedsAvailableCash).toBe(true);
    expect(result.shortfall).toBe(250);
    expect(result.safeExtraPayment).toBe(0);
  });
});
