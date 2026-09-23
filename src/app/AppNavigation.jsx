import { useState } from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/expenses", label: "Expenses" },
  { to: "/create", label: "Create loan" },
  { to: "/record", label: "Record payment" },
  { to: "/schedule", label: "Payment schedule" },
  { to: "/history", label: "History & forecast" },
];

export default function AppNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={`app-nav${open ? " app-nav--open" : ""}`}>
      <button
        className="nav-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="app-nav-links"
      >
        {open ? "Close menu" : "Menu"}
      </button>
      <div className="nav-links" id="app-nav-links">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `nav-link${isActive ? " nav-link--active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
