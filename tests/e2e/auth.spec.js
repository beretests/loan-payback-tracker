import { expect, test } from "@playwright/test";

test("sign-in and password recovery routes render responsively", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Debt Payback and Expense Tracker" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByText("Enter your email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("explicit reset route renders the new-password form", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Confirm new password", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();
});
