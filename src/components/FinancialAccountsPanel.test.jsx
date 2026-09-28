import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FinancialAccountsPanel from "./FinancialAccountsPanel";

function accountData(overrides = {}) {
  return {
    accounts: [],
    debts: [
      { id: "visa-debt", name: "Everyday Visa debt", debt_type: "credit_card" },
      { id: "loc-debt", name: "Emergency LoC", debt_type: "line_of_credit" },
    ],
    loading: false,
    error: "",
    createAccount: vi.fn().mockResolvedValue(true),
    updateAccount: vi.fn().mockResolvedValue(true),
    archiveAccount: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("FinancialAccountsPanel", () => {
  it("creates a named credit card linked to a matching debt", async () => {
    const user = userEvent.setup();
    const data = accountData();
    render(<FinancialAccountsPanel accountData={data} />);

    await user.type(screen.getByLabelText("Account name"), "Everyday Visa");
    await user.selectOptions(screen.getByLabelText("Type"), "credit_card");
    await user.type(screen.getByLabelText("Institution"), "Example Bank");
    await user.type(screen.getByLabelText("Last four digits"), "1234");

    const linkedDebt = screen.getByLabelText("Linked debt");
    expect(screen.getByRole("option", { name: "Everyday Visa debt" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Emergency LoC" })).not.toBeInTheDocument();
    await user.selectOptions(linkedDebt, "visa-debt");
    await user.click(screen.getByRole("button", { name: "Add account" }));

    expect(data.createAccount).toHaveBeenCalledWith({
      name: "Everyday Visa",
      accountType: "credit_card",
      institution: "Example Bank",
      lastFour: "1234",
      linkedLoanId: "visa-debt",
    });
  });

  it("shows the safe account identifier and linked debt", () => {
    render(
      <FinancialAccountsPanel
        accountData={accountData({
          accounts: [
            {
              id: "account-1",
              name: "Everyday Visa",
              account_type: "credit_card",
              institution: "Example Bank",
              last_four: "1234",
              linked_loan_id: "visa-debt",
              linkedDebt: { name: "Everyday Visa debt" },
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Everyday Visa •••• 1234")).toBeInTheDocument();
    expect(screen.getByText(/linked to Everyday Visa debt/)).toBeInTheDocument();
  });
});
