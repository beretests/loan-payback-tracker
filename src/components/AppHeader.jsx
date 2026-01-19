export default function AppHeader({ title, userEmail, onSignOut }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#555" }}>{userEmail}</div>
        <button onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
