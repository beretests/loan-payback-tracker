import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PageTaskBar from "./PageTaskBar";

const tasks = [
  { target: "expense-form", label: "Expense", action: "Add · edit" },
  { target: "expense-list", label: "Activity", action: "View · delete" },
];

describe("PageTaskBar", () => {
  it("exposes every page task and its action above the page content", () => {
    render(<PageTaskBar title="Expenses" tasks={tasks} />);

    const navigation = screen.getByRole("navigation", {
      name: "Expenses available tasks",
    });
    const links = within(navigation).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "#expense-form");
    expect(within(links[0]).getByText("Add · edit")).toBeInTheDocument();
  });

  it("can select a page mode before jumping to its section", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PageTaskBar
        title="History"
        tasks={[{ ...tasks[0], onSelect }]}
      />,
    );

    await user.click(screen.getByRole("link", { name: /Expense/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
