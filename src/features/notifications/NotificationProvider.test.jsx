import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NotificationProvider } from "./NotificationProvider";
import { useNotifications } from "./NotificationContext";

function Harness() {
  const notifications = useNotifications();
  return (
    <>
      <button onClick={() => notifications.success("Expense added.")}>
        Succeed
      </button>
      <button
        onClick={() =>
          notifications.error(
            new Error("Database unavailable"),
            "Could not save.",
          )
        }
      >
        Fail
      </button>
    </>
  );
}

describe("NotificationProvider", () => {
  it("announces and dismisses success notifications", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Harness />
      </NotificationProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Succeed" }));
    expect(screen.getByRole("status")).toHaveTextContent("Expense added.");
    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the detailed error message", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Harness />
      </NotificationProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Fail" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Database unavailable",
    );
  });
});
