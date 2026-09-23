import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthPanel from "./AuthPanel";

function renderPanel(overrides = {}) {
  const props = {
    authView: "sign-in",
    authEmail: "",
    authPassword: "",
    resetPassword: "",
    resetPasswordConfirm: "",
    authError: "",
    authMessage: "",
    authBusy: false,
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onResetPasswordChange: vi.fn(),
    onResetPasswordConfirmChange: vi.fn(),
    onSignIn: vi.fn(),
    onSignUp: vi.fn(),
    onRequestPasswordReset: vi.fn(),
    onUpdatePassword: vi.fn(),
    onShowForgotPassword: vi.fn(),
    onBackToSignIn: vi.fn(),
    ...overrides,
  };
  render(<AuthPanel {...props} />);
  return props;
}

describe("AuthPanel", () => {
  it("submits the sign-in form", async () => {
    const props = renderPanel({
      authEmail: "person@example.com",
      authPassword: "password",
    });

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(props.onSignIn).toHaveBeenCalledOnce();
  });

  it("renders the password recovery form", () => {
    renderPanel({ authView: "reset-password" });

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeInTheDocument();
  });
});
