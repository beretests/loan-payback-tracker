import React, { useMemo, useState } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

/** ---------- Date helpers (UTC-safe) ---------- **/
function toDateOnly(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysBetween(a, b) {
  // a < b
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
function addMonthsUTC(d, months) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  const nd = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(
    Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() + 1, 0)
  ).getUTCDate();
  nd.setUTCDate(Math.min(day, lastDay));
  return nd;
}

/** ---------- Money / formatting ---------- **/
function money(n) {
  if (!isFinite(n)) return "";
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD" });
}
function pct(n) {
  if (!isFinite(n)) return "";
  return `${(n * 100).toFixed(3)}%`;
}

/** ---------- Loan math ---------- **/
function calcMonthlyPayment(P, annualRate, nMonths) {
  const r = annualRate / 12;
  if (r === 0) return P / nMonths;
  return (P * r) / (1 - Math.pow(1 + r, -nMonths));
}

/**
 * Rate periods:
 * [{ effectiveDate: 'YYYY-MM-DD', annualRate: 0.0675 }, ...]
 * Assumption: annualRate remains in effect until next effectiveDate.
 */
function normalizeRatePeriods(ratePeriods, loanStartDate) {
  const start = toDateOnly(loanStartDate);

  const cleaned = (ratePeriods || [])
    .filter((rp) => rp.effectiveDate && isFinite(rp.annualRate))
    .map((rp) => ({
      date: toDateOnly(rp.effectiveDate),
      annualRate: Number(rp.annualRate),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Ensure there is a rate at/ before start date. If first rate starts after loan start, clamp it to start.
  if (cleaned.length === 0) {
    // Caller should ensure at least one rate; handle gracefully
    return [{ date: start, annualRate: 0 }];
  }
  if (cleaned[0].date.getTime() > start.getTime()) {
    cleaned.unshift({ date: start, annualRate: cleaned[0].annualRate });
  } else if (cleaned[0].date.getTime() < start.getTime()) {
    // Keep; it will apply at start. No change.
  } else {
    // exactly on start; fine
  }
  return cleaned;
}

/**
 * Accrue interest on a constant balance between two dates under variable rate periods.
 * Splits the span at each rate boundary.
 */
function accrueInterestVariableRate(
  balance,
  fromDate,
  toDate,
  ratePeriods,
  dayCountBasis
) {
  if (balance <= 0) return { interest: 0, breakdown: [] };
  if (toDate.getTime() <= fromDate.getTime())
    return { interest: 0, breakdown: [] };

  let interest = 0;
  const breakdown = [];

  // Find the active rate index at fromDate
  let i = 0;
  while (
    i + 1 < ratePeriods.length &&
    ratePeriods[i + 1].date.getTime() <= fromDate.getTime()
  ) {
    i++;
  }

  let cursor = fromDate;

  while (cursor.getTime() < toDate.getTime()) {
    const rate = ratePeriods[i].annualRate;
    const nextBoundary =
      i + 1 < ratePeriods.length ? ratePeriods[i + 1].date : null;

    const segmentEnd =
      nextBoundary && nextBoundary.getTime() < toDate.getTime()
        ? nextBoundary
        : toDate;

    const days = daysBetween(cursor, segmentEnd);
    if (days > 0) {
      const segInterest = balance * (rate / dayCountBasis) * days;
      interest += segInterest;
      breakdown.push({
        from: fmtDate(cursor),
        to: fmtDate(segmentEnd),
        days,
        rate,
        interest: segInterest,
      });
    }

    cursor = segmentEnd;
    if (nextBoundary && cursor.getTime() === nextBoundary.getTime()) {
      i = Math.min(i + 1, ratePeriods.length - 1);
    } else {
      break;
    }
  }

  return { interest, breakdown };
}

function buildScheduleFixedPayment({
  principal,
  startDate,
  amortMonths,
  monthlyPayment,
  dayCountBasis,
  ratePeriods, // normalized: [{date: Date, annualRate}]
  extraPayments, // [{date:'YYYY-MM-DD', amount:number}]
  extraAppliesToPrincipalOnly = true,
}) {
  const start = toDateOnly(startDate);

  // Monthly events for up to amortMonths (may end early)
  const monthlyEvents = [];
  for (let i = 1; i <= amortMonths; i++) {
    monthlyEvents.push({
      type: "monthly",
      date: addMonthsUTC(start, i),
      amount: monthlyPayment,
    });
  }

  const extraEvents = (extraPayments || [])
    .filter((p) => p.date && Number(p.amount) > 0)
    .map((p) => ({
      type: "extra",
      date: toDateOnly(p.date),
      amount: Number(p.amount),
    }));

  // Sort: by date; if same day, extra before monthly
  const events = [...monthlyEvents, ...extraEvents].sort((a, b) => {
    const t = a.date.getTime() - b.date.getTime();
    if (t !== 0) return t;
    if (a.type === b.type) return 0;
    return a.type === "extra" ? -1 : 1;
  });

  let bal = Number(principal);
  let lastDate = start;

  let totalInterest = 0;
  let totalPaid = 0;

  const rows = [];

  for (const ev of events) {
    if (bal <= 0) break;

    const { interest: interestAccrued } = accrueInterestVariableRate(
      bal,
      lastDate,
      ev.date,
      ratePeriods,
      dayCountBasis
    );

    totalInterest += interestAccrued;

    let payment = ev.amount;

    // If monthly payment overshoots final payoff, cap it to what's needed (interest + principal)
    if (ev.type === "monthly") {
      const maxNeeded = interestAccrued + bal;
      if (payment > maxNeeded) payment = maxNeeded;
    } else {
      // extra: cap to remaining principal if principal-only
      if (extraAppliesToPrincipalOnly) {
        if (payment > bal) payment = bal;
      } else {
        // interest-first for extra: cap to interest + principal
        const maxNeeded = interestAccrued + bal;
        if (payment > maxNeeded) payment = maxNeeded;
      }
    }

    let toInterest = 0;
    let toPrincipal = 0;

    if (ev.type === "monthly") {
      toInterest = Math.min(payment, interestAccrued);
      toPrincipal = Math.max(0, payment - toInterest);
    } else {
      if (extraAppliesToPrincipalOnly) {
        toInterest = 0;
        toPrincipal = payment;
      } else {
        toInterest = Math.min(payment, interestAccrued);
        toPrincipal = Math.max(0, payment - toInterest);
      }
    }

    bal = Math.max(0, bal - toPrincipal);
    totalPaid += payment;

    rows.push({
      date: fmtDate(ev.date),
      type: ev.type,
      payment,
      interestAccrued,
      toInterest,
      toPrincipal,
      balance: bal,
    });

    lastDate = ev.date;
  }

  const payoffDate = rows.length ? rows[rows.length - 1].date : null;

  return {
    rows,
    payoffDate,
    endingBalance: bal,
    totalInterest,
    totalPaid,
  };
}

function resetAll() {
  const keys = [
    "loan.principal",
    "loan.startDate",
    "loan.amortMonths",
    "loan.dayCountBasis",
    "loan.ratePeriods",
    "loan.monthlyPaymentOverride",
    "loan.extraPayments",
    "loan.extraPrincipalOnly",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

/** ---------- UI ---------- **/
export default function App() {
  const [principal, setPrincipal] = useLocalStorageState(
    "loan.principal",
    20000
  );
  const [startDate, setStartDate] = useLocalStorageState(
    "loan.startDate",
    "2026-01-01"
  );
  const [amortMonths, setAmortMonths] = useLocalStorageState(
    "loan.amortMonths",
    60
  );
  const [dayCountBasis, setDayCountBasis] = useLocalStorageState(
    "loan.dayCountBasis",
    365
  );

  const [ratePeriodsInput, setRatePeriodsInput] = useLocalStorageState(
    "loan.ratePeriods",
    [{ effectiveDate: "2026-01-01", annualRate: 0.0675 }]
  );

  const [monthlyPaymentOverride, setMonthlyPaymentOverride] =
    useLocalStorageState("loan.monthlyPaymentOverride", "");

  const [extraPayments, setExtraPayments] = useLocalStorageState(
    "loan.extraPayments",
    []
  );
  const [extraPrincipalOnly, setExtraPrincipalOnly] = useLocalStorageState(
    "loan.extraPrincipalOnly",
    true
  );
  // const [principal, setPrincipal] = useState(20000);
  // const [startDate, setStartDate] = useState("2026-01-01");
  // const [amortMonths, setAmortMonths] = useState(60);
  // const [dayCountBasis, setDayCountBasis] = useState(365);

  // Rate periods (prime - 0.25); user can add rows when prime changes
  // const [ratePeriodsInput, setRatePeriodsInput] = useState([
  // { effectiveDate: "2026-01-01", annualRate: 0.0675 },
  // ]);

  const normalizedRates = useMemo(
    () => normalizeRatePeriods(ratePeriodsInput, startDate),
    [ratePeriodsInput, startDate]
  );

  // Monthly payment: compute from principal, FIRST rate, amortMonths (user can override)
  const initialRate = normalizedRates[0]?.annualRate ?? 0;
  const computedMonthlyPayment = useMemo(() => {
    return calcMonthlyPayment(
      Number(principal),
      Number(initialRate),
      Number(amortMonths)
    );
  }, [principal, initialRate, amortMonths]);

  // const [monthlyPaymentOverride, setMonthlyPaymentOverride] = useState("");
  const monthlyPayment =
    monthlyPaymentOverride.trim() === ""
      ? computedMonthlyPayment
      : Number(monthlyPaymentOverride);

  // const [extraPayments, setExtraPayments] = useState([]);
  // const [extraPrincipalOnly, setExtraPrincipalOnly] = useState(true);

  const schedule = useMemo(() => {
    return buildScheduleFixedPayment({
      principal: Number(principal),
      startDate,
      amortMonths: Number(amortMonths),
      monthlyPayment: Number(monthlyPayment),
      dayCountBasis: Number(dayCountBasis),
      ratePeriods: normalizedRates,
      extraPayments,
      extraAppliesToPrincipalOnly: extraPrincipalOnly,
    });
  }, [
    principal,
    startDate,
    amortMonths,
    monthlyPayment,
    dayCountBasis,
    normalizedRates,
    extraPayments,
    extraPrincipalOnly,
  ]);

  function addRateRow() {
    setRatePeriodsInput((prev) => [
      ...prev,
      { effectiveDate: startDate, annualRate: initialRate },
    ]);
  }
  function updateRateRow(i, patch) {
    setRatePeriodsInput((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }
  function removeRateRow(i) {
    setRatePeriodsInput((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addExtraRow() {
    setExtraPayments((prev) => [...prev, { date: startDate, amount: 0 }]);
  }
  function updateExtraRow(i, patch) {
    setExtraPayments((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    );
  }
  function removeExtraRow(i) {
    setExtraPayments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function exportScheduleToCSV(schedule) {
    if (!schedule?.rows?.length) return;

    const headers = [
      "Date",
      "Type",
      "Payment",
      "InterestAccrued",
      "ToInterest",
      "ToPrincipal",
      "Balance",
    ];

    const lines = [
      headers.join(","),
      ...schedule.rows.map((r) =>
        [
          r.date,
          r.type,
          r.payment.toFixed(2),
          r.interestAccrued.toFixed(2),
          r.toInterest.toFixed(2),
          r.toPrincipal.toFixed(2),
          r.balance.toFixed(2),
        ].join(",")
      ),
    ];

    const csv = lines.join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "loan-schedule.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        margin: "clamp(12px, 3vw, 24px) auto",
        padding: "clamp(12px, 2.5vw, 48px)",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2 style={{}}>Loan Tracker (Fixed Monthly Payment)</h2>
        <button
          onClick={resetAll}
          style={{
            marginBottom: 12,
            alignSelf: "flex-end",
            fontSize: 12,
            padding: "4px 8px",
            cursor: schedule.rows.length ? "pointer" : "not-allowed",
          }}
        >
          Reset saved data
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <label>
          Principal (CAD)
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Amortization (months)
          <input
            type="number"
            value={amortMonths}
            onChange={(e) => setAmortMonths(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Day-count basis
          <select
            value={dayCountBasis}
            onChange={(e) => setDayCountBasis(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={365}>365</option>
            <option value={360}>360</option>
          </select>
        </label>
        <label>
          Monthly payment (optional override)
          <input
            type="number"
            placeholder={computedMonthlyPayment.toFixed(2)}
            value={monthlyPaymentOverride}
            onChange={(e) => setMonthlyPaymentOverride(e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 12, color: "#555" }}>
            Computed (using first rate): {money(computedMonthlyPayment)}
          </div>
        </label>
        <div style={{ alignSelf: "end" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={extraPrincipalOnly}
              onChange={(e) => setExtraPrincipalOnly(e.target.checked)}
            />
            Extra payments apply to principal only
          </label>
          <div style={{ fontSize: 12, color: "#555" }}>
            Fixed monthly payment; extra payments shorten payoff.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3>Rate changes (prime − 0.25)</h3>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
          Add a row whenever prime changes. Interest accrues daily and is split
          across these effective dates.
        </div>
        <button onClick={addRateRow}>Add rate row</button>

        <div
          style={{
            marginTop: 8,
            display: "grid",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {ratePeriodsInput.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 180px 120px",
                gap: 8,
                alignItems: "stretch",
                minHeight: 72,
              }}
            >
              <label>
                Effective date
                <input
                  type="date"
                  value={r.effectiveDate}
                  onChange={(e) =>
                    updateRateRow(i, { effectiveDate: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Annual rate (decimal)
                <input
                  type="number"
                  step="0.0001"
                  value={r.annualRate}
                  onChange={(e) =>
                    updateRateRow(i, { annualRate: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: 12, color: "#555" }}>
                  {pct(Number(r.annualRate))}
                </div>
              </label>
              <button
                onClick={() => removeRateRow(i)}
                disabled={ratePeriodsInput.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3>Extra payments</h3>
        <button onClick={addExtraRow}>Add extra payment</button>

        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {extraPayments.map((p, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 160px 120px",
                gap: 8,
                alignItems: "end",
              }}
            >
              <label>
                Date
                <input
                  type="date"
                  value={p.date}
                  onChange={(e) => updateExtraRow(i, { date: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    updateExtraRow(i, { amount: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <button onClick={() => removeExtraRow(i)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>Total paid</div>
          <div style={{ fontSize: 20 }}>{money(schedule.totalPaid)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>Total interest</div>
          <div style={{ fontSize: 20 }}>{money(schedule.totalInterest)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>Ending balance</div>
          <div style={{ fontSize: 20 }}>{money(schedule.endingBalance)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Payoff date (estimated)
          </div>
          <div style={{ fontSize: 20 }}>{schedule.payoffDate ?? "-"}</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Schedule</h3>
        <button
          onClick={() => exportScheduleToCSV(schedule)}
          disabled={!schedule.rows.length}
          style={{
            fontSize: 12,
            padding: "4px 8px",
            cursor: schedule.rows.length ? "pointer" : "not-allowed",
            // alignSelf: "flex-end",
            justifySelf: "flex-end",
          }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Date",
                "Type",
                "Payment",
                "Interest accrued",
                "To interest",
                "To principal",
                "Balance",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((r, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #eee",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.date}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {r.type}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.payment)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.interestAccrued)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.toInterest)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.toPrincipal)}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {money(r.balance)}
                </td>
              </tr>
            ))}
            {schedule.rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 8 }}>
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
        Implementation notes: interest is accrued daily and segmented across
        rate-change effective dates. Monthly payment remains fixed; extra
        payments reduce principal and shorten the payoff.
      </div>
    </div>
  );
}
