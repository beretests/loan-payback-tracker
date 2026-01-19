export default function TabSwitcher({ tab, onTabChange }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          onClick={() => onTabChange("actual")}
          style={{ fontWeight: tab === "actual" ? 700 : 400 }}
        >
          Actual
        </button>
        <button
          onClick={() => onTabChange("forecast")}
          style={{ fontWeight: tab === "forecast" ? 700 : 400 }}
        >
          Forecast
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
        {tab === "actual"
          ? "Actual uses only recorded payments. Missed/partial/late are tracked from scheduled obligations."
          : "Forecast assumes every monthly payment is made on schedule (fixed amount), plus recorded extra payments. Missed payments are not reflected in Forecast."}
      </div>
    </>
  );
}
