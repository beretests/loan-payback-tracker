import { describe, expect, it } from "vitest";
import { summarizeCashFlow } from "./cashFlow";

describe("summarizeCashFlow", () => {
  it("subtracts ordinary expenses from income", () => {
    expect(
      summarizeCashFlow(
        [{ received_on: "2026-09-01", amount: "4000" }],
        [
          { spent_on: "2026-09-02", amount: "1200" },
          { spent_on: "2026-09-03", amount: "300" },
        ],
        "2026-09",
      ),
    ).toEqual({ income: 4000, spending: 1500, available: 2500 });
  });

  it("does not count payment events because they are a separate data stream", () => {
    const result = summarizeCashFlow(
      [{ received_on: "2026-09-01", amount: 1000 }],
      [],
      "2026-09",
    );
    expect(result.available).toBe(1000);
  });
});
