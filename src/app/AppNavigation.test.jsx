import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AppNavigation from "./AppNavigation";

describe("AppNavigation", () => {
  it("preserves every loan workflow route", () => {
    render(
      <MemoryRouter>
        <AppNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Expenses" })).toHaveAttribute(
      "href",
      "/expenses",
    );
    expect(screen.getByRole("link", { name: "Income" })).toHaveAttribute(
      "href",
      "/income",
    );
    expect(screen.getByRole("link", { name: "Create loan" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(
      screen.getByRole("link", { name: "Record payment" }),
    ).toHaveAttribute("href", "/record");
    expect(
      screen.getByRole("link", { name: "Payment schedule" }),
    ).toHaveAttribute("href", "/schedule");
    expect(
      screen.getByRole("link", { name: "History & forecast" }),
    ).toHaveAttribute("href", "/history");
  });

  it("opens and closes the mobile menu", async () => {
    render(
      <MemoryRouter>
        <AppNavigation />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    const toggle = screen.getByRole("button", { name: "Menu" });

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
