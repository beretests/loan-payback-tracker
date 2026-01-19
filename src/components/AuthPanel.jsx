export default function AuthPanel({
  authEmail,
  authPassword,
  authError,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignUp,
}) {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "24px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2>Loan Payback Tracker </h2>
      <p>
        Sign in to load and save your loan, scheduled payments, and payment
        history.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          maxWidth: 520,
        }}
      >
        <label>
          Email
          <input
            value={authEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={authPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onSignIn}>Sign in</button>
        <button onClick={onSignUp}>Sign up</button>
      </div>

      {authError && (
        <div style={{ marginTop: 12, color: "crimson" }}>{authError}</div>
      )}
    </div>
  );
}
