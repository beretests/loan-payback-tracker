import { describe, expect, it } from "vitest";
import { allocateLumpSumPayment } from "./paymentAllocation";

const loans = [
  { id: "loan-a", name: "Loan A", fixed_monthly_payment: 300 },
  { id: "loan-b", name: "Loan B", fixed_monthly_payment: 200 },
];

describe("allocateLumpSumPayment", () => {
  it("covers each selected monthly payment exactly", () => {
    const result = allocateLumpSumPayment({
      amount: 500,
      selectedLoans: loans,
      extraLoanId: "loan-a",
    });

    expect(
      result.regularAllocations.map(({ loanId, amount }) => ({
        loanId,
        amount,
      })),
    ).toEqual([
      { loanId: "loan-a", amount: 300 },
      { loanId: "loan-b", amount: 200 },
    ]);
    expect(result.extraAllocation).toBeNull();
  });

  it("splits a short payment proportionally", () => {
    const result = allocateLumpSumPayment({
      amount: 250,
      selectedLoans: loans,
      extraLoanId: "loan-a",
    });

    expect(result.regularAllocations.map((item) => item.amount)).toEqual([
      150,
      100,
    ]);
  });

  it("assigns the remainder as an extra payment", () => {
    const result = allocateLumpSumPayment({
      amount: 600,
      selectedLoans: loans,
      extraLoanId: "loan-b",
    });

    expect(result.extraAllocation).toMatchObject({
      loanId: "loan-b",
      amount: 100,
    });
  });

  it("preserves every cent when proportional shares need rounding", () => {
    const equalLoans = ["a", "b", "c"].map((id) => ({
      id,
      name: id,
      fixed_monthly_payment: 1,
    }));
    const result = allocateLumpSumPayment({
      amount: 1,
      selectedLoans: equalLoans,
      extraLoanId: "a",
    });

    expect(result.regularAllocations.map((item) => item.amount)).toEqual([
      0.34,
      0.33,
      0.33,
    ]);
  });

  it("rejects invalid amounts and empty selections", () => {
    expect(() =>
      allocateLumpSumPayment({
        amount: 0,
        selectedLoans: loans,
        extraLoanId: "loan-a",
      }),
    ).toThrow("greater than 0");
    expect(() =>
      allocateLumpSumPayment({
        amount: 100,
        selectedLoans: [],
        extraLoanId: "",
      }),
    ).toThrow("Select at least one loan");
  });
});
