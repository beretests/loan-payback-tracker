import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page-stack">
      <section className="panel" style={{ color: "#555" }}>
        Page not found. Go back <Link to="/">home</Link>.
      </section>
    </div>
  );
}
