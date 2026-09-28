import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecurringExpensesPanel from "./RecurringExpensesPanel";

const mocks = vi.hoisted(() => ({
  createDefinition: vi.fn(),
}));

vi.mock("../features/expenses/useRecurringExpenses", () => ({
  useRecurringExpenses: () => ({
    definitions: [],
    loading: false,
    error: "",
    createDefinition: mocks.createDefinition,
    toggleDefinition: vi.fn(),
    deleteDefinition: vi.fn(),
  }),
}));

describe("RecurringExpensesPanel", () => {
  beforeEach(() => {
    mocks.createDefinition.mockReset().mockResolvedValue(true);
  });

  it("creates a yearly recurring expense", async () => {
    const user = userEvent.setup();
    render(
      <RecurringExpensesPanel
        user={{ id: "user-1" }}
        categories={[{ id: "category-1", name: "Subscriptions" }]}
        accounts={[]}
        onExpensesChanged={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Description"), "Domain renewal");
    await user.type(screen.getByLabelText("Amount"), "25");
    await user.selectOptions(screen.getByLabelText("Repeats"), "yearly");
    await user.click(
      screen.getByRole("button", { name: "Add recurring expense" }),
    );

    expect(mocks.createDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Domain renewal",
        amount: "25",
        cadence: "yearly",
        categoryId: "category-1",
      }),
    );
  });
});
