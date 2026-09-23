import { describe, expect, it } from "vitest";
import { expensesForMonth, summarizeExpenses } from "./expenseSummary";

const expenses = [
  {
    id: "1",
    spent_on: "2026-09-02",
    amount: "25.50",
    expense_categories: { name: "Groceries" },
  },
  {
    id: "2",
    spent_on: "2026-09-12",
    amount: 10,
    expense_categories: { name: "Groceries" },
  },
  {
    id: "3",
    spent_on: "2026-08-30",
    amount: 90,
    expense_categories: { name: "Transportation" },
  },
  {
    id: "4",
    spent_on: "2026-09-20",
    amount: 100,
    deleted_at: "2026-09-21T00:00:00Z",
    expense_categories: { name: "Subscriptions" },
  },
];

describe("expense summaries", () => {
  it("includes only active ordinary expenses in the selected month", () => {
    expect(expensesForMonth(expenses, "2026-09").map(({ id }) => id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("totals categories without debt payment events", () => {
    expect(summarizeExpenses(expenses, "2026-09")).toEqual({
      total: 35.5,
      count: 2,
      byCategory: [{ name: "Groceries", amount: 35.5 }],
    });
  });
});
