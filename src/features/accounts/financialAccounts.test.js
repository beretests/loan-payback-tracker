import { describe, expect, it } from "vitest";
import {
  financialAccountLabel,
  paymentMethodForAccountType,
  paymentSourceLabel,
  summarizeByPaymentSource,
} from "./financialAccounts";

describe("financial account presentation", () => {
  it("shows a named account with its safe identifier", () => {
    expect(financialAccountLabel({ name: "Everyday Visa", last_four: "1234" }))
      .toBe("Everyday Visa •••• 1234");
  });

  it("derives the compatible generic payment method", () => {
    expect(paymentMethodForAccountType("bank_account")).toBe("bank_transfer");
    expect(paymentMethodForAccountType("line_of_credit")).toBe("line_of_credit");
  });

  it("prefers a named account and falls back to the generic method", () => {
    expect(paymentSourceLabel({
      payment_method: "credit_card",
      financial_accounts: { name: "Rewards Mastercard", last_four: "9876" },
    })).toBe("Rewards Mastercard •••• 9876");
    expect(paymentSourceLabel({ payment_method: "debit_card" })).toBe("Debit card");
  });

  it("summarizes monthly ordinary spending by its payment source", () => {
    const expenses = [
      {
        amount: 40,
        spent_on: "2026-09-03",
        payment_method: "credit_card",
        financial_accounts: { name: "Everyday Visa", last_four: "1234" },
      },
      {
        amount: 15,
        spent_on: "2026-09-04",
        payment_method: "credit_card",
        financial_accounts: { name: "Everyday Visa", last_four: "1234" },
      },
      { amount: 30, spent_on: "2026-09-05", payment_method: "debit_card" },
      { amount: 500, spent_on: "2026-08-01", payment_method: "cash" },
    ];

    expect(summarizeByPaymentSource(expenses, "2026-09")).toEqual([
      { name: "Everyday Visa •••• 1234", amount: 55 },
      { name: "Debit card", amount: 30 },
    ]);
  });
});
