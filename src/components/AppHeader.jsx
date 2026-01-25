export default function AppHeader({ title, userEmail, onSignOut }) {
  return (
    <header className="app-header">
      <div>
        <div className="app-title">{title}</div>
        <div className="app-subtitle">Track, plan, and stay on top of loans</div>
      </div>
      <div className="app-user">
        <div className="app-user__email">{userEmail}</div>
        <button onClick={onSignOut}>Sign out</button>
      </div>
    </header>
  );
}
