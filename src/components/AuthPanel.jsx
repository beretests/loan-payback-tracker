export default function AuthPanel({
  authView,
  authEmail,
  authPassword,
  resetPassword,
  resetPasswordConfirm,
  authError,
  authMessage,
  authBusy,
  onEmailChange,
  onPasswordChange,
  onResetPasswordChange,
  onResetPasswordConfirmChange,
  onSignIn,
  onSignUp,
  onRequestPasswordReset,
  onUpdatePassword,
  onShowForgotPassword,
  onBackToSignIn,
}) {
  const isForgotPassword = authView === "forgot-password";
  const isResetPassword = authView === "reset-password";

  function handleSubmit(event) {
    event.preventDefault();
    if (isForgotPassword) onRequestPasswordReset();
    else if (isResetPassword) onUpdatePassword();
    else onSignIn();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <h2 id="auth-title">Debt Payback and Expense Tracker</h2>

        {isForgotPassword ? (
          <p>Enter your email and we’ll send you a link to reset your password.</p>
        ) : isResetPassword ? (
          <p>Choose a new password for your account.</p>
        ) : (
          <p>
            Sign in to load and save your loan, scheduled payments, and payment
            history.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isResetPassword && (
            <label>
              Email
              <input
                type="email"
                value={authEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                autoComplete="email"
                required
                disabled={authBusy}
              />
            </label>
          )}

          {!isForgotPassword && !isResetPassword && (
            <label>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => onPasswordChange(event.target.value)}
                autoComplete="current-password"
                required
                disabled={authBusy}
              />
            </label>
          )}

          {isResetPassword && (
            <>
              <label>
                New password
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(event) =>
                    onResetPasswordChange(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={authBusy}
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(event) =>
                    onResetPasswordConfirmChange(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={authBusy}
                />
              </label>
            </>
          )}

          <div className="auth-actions">
            <button type="submit" disabled={authBusy}>
              {authBusy
                ? "Please wait…"
                : isForgotPassword
                  ? "Send reset link"
                  : isResetPassword
                    ? "Update password"
                    : "Sign in"}
            </button>

            {!isForgotPassword && !isResetPassword && (
              <button type="button" onClick={onSignUp} disabled={authBusy}>
                Sign up
              </button>
            )}
          </div>

          {!isForgotPassword && !isResetPassword && (
            <button
              className="auth-link-button"
              type="button"
              onClick={onShowForgotPassword}
              disabled={authBusy}
            >
              Forgot password?
            </button>
          )}

          {(isForgotPassword || isResetPassword) && (
            <button
              className="auth-link-button"
              type="button"
              onClick={onBackToSignIn}
              disabled={authBusy}
            >
              Back to sign in
            </button>
          )}
        </form>

        {authError && (
          <div className="auth-status auth-status--error" role="alert">
            {authError}
          </div>
        )}
        {authMessage && (
          <div className="auth-status auth-status--success" role="status">
            {authMessage}
          </div>
        )}
      </section>
    </main>
  );
}
