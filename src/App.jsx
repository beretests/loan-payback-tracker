import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { buildScheduledPayments } from "./scheduleGen";
import {
  calcMonthlyPayment,
  normalizeRatePeriods,
  buildActualEventsFromPaymentEvents,
  buildScheduleFromActualEvents,
  computeScheduledStatuses,
  buildForecastScheduleFixedPayment,
} from "./loanMath";
import { exportRowsToCSV } from "./csv";

function money(n) {
  if (!isFinite(n)) return "";
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "CAD",
  });
}
function pct(n) {
  if (!isFinite(n)) return "";
  return `${(Number(n) * 100).toFixed(3)}%`;
}
function todayUtcDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function App() {
  /** ---------- Auth state ---------- **/
  const [session, setSession] = useState(null);
  const user = session?.user ?? null;

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState("actual"); // "actual" | "forecast"

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
  }
  async function signUp() {
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    else
      setAuthError(
        "Sign-up successful. Check email if confirmation is enabled."
      );
  }
  async function signOut() {
    await supabase.auth.signOut();
  }

  /** ---------- Loan selection + data ---------- **/
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");

  const [loan, setLoan] = useState(null);
  const [ratePeriods, setRatePeriods] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState("");

  async function refreshLoans() {
    if (!user) return;
    const { data, error } = await supabase
      .from("loans")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setLoans(data ?? []);
    if (!selectedLoanId && data?.length) setSelectedLoanId(data[0].id);
  }

  async function loadLoanData(loanId) {
    setLoading(true);
    setAppError("");
    try {
      const loanQ = supabase
        .from("loans")
        .select("*")
        .eq("id", loanId)
        .single();
      const ratesQ = supabase
        .from("rate_periods")
        .select("*")
        .eq("loan_id", loanId)
        .order("effective_date");
      const schedQ = supabase
        .from("scheduled_payments")
        .select("*")
        .eq("loan_id", loanId)
        .order("due_date");
      const eventsQ = supabase
        .from("payment_events")
        .select("*")
        .eq("loan_id", loanId)
        .order("paid_date");

      const [loanR, ratesR, schedR, eventsR] = await Promise.all([
        loanQ,
        ratesQ,
        schedQ,
        eventsQ,
      ]);

      if (loanR.error) throw loanR.error;
      if (ratesR.error) throw ratesR.error;
      if (schedR.error) throw schedR.error;
      if (eventsR.error) throw eventsR.error;

      setLoan(loanR.data);
      setRatePeriods(ratesR.data ?? []);
      setScheduled(schedR.data ?? []);
      setEvents(eventsR.data ?? []);
    } catch (e) {
      setAppError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    refreshLoans().catch((e) => setAppError(e.message ?? String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !selectedLoanId) return;
    loadLoanData(selectedLoanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedLoanId]);

  /** ---------- Create loan form ---------- **/
  const [newName, setNewName] = useState("Friend Loan");
  const [newPrincipal, setNewPrincipal] = useState(20000);
  const [newStartDate, setNewStartDate] = useState(todayUtcDateString());
  const [newAmortMonths, setNewAmortMonths] = useState(60);
  const [newDayCount, setNewDayCount] = useState(365);

  // Prime input as percent; convert to loan annual decimal = prime%/100 - 0.0025
  const [newPrimePct, setNewPrimePct] = useState(6.75); // example
  const newLoanRateDecimal = useMemo(
    () => Number(newPrimePct) / 100 - 0.0025,
    [newPrimePct]
  );

  const computedNewMonthly = useMemo(() => {
    return calcMonthlyPayment(
      Number(newPrincipal),
      Number(newLoanRateDecimal),
      Number(newAmortMonths)
    );
  }, [newPrincipal, newLoanRateDecimal, newAmortMonths]);

  const [newMonthlyOverride, setNewMonthlyOverride] = useState("");
  const newFixedMonthlyPayment = useMemo(() => {
    return newMonthlyOverride.trim() === ""
      ? computedNewMonthly
      : Number(newMonthlyOverride);
  }, [newMonthlyOverride, computedNewMonthly]);

  async function createLoan() {
    if (!user) return;
    setLoading(true);
    setAppError("");
    try {
      // 1) Create loan
      const { data: created, error: loanErr } = await supabase
        .from("loans")
        .insert([
          {
            user_id: user.id,
            name: newName,
            principal: Number(newPrincipal),
            start_date: newStartDate,
            amort_months: Number(newAmortMonths),
            day_count_basis: Number(newDayCount),
            fixed_monthly_payment: Number(newFixedMonthlyPayment),
          },
        ])
        .select()
        .single();
      if (loanErr) throw loanErr;

      // 2) Insert initial rate period
      const { error: rateErr } = await supabase.from("rate_periods").insert([
        {
          loan_id: created.id,
          effective_date: newStartDate,
          annual_rate: Number(newLoanRateDecimal),
        },
      ]);
      if (rateErr) throw rateErr;

      // 3) Insert schedule rows
      const schedRows = buildScheduledPayments(
        newStartDate,
        Number(newAmortMonths),
        Number(newFixedMonthlyPayment)
      ).map((r) => ({ ...r, loan_id: created.id }));

      const { error: schedErr } = await supabase
        .from("scheduled_payments")
        .insert(schedRows);
      if (schedErr) throw schedErr;

      await refreshLoans();
      setSelectedLoanId(created.id);
    } catch (e) {
      setAppError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  /** ---------- Record payment form ---------- **/
  const [payDate, setPayDate] = useState(todayUtcDateString());
  const [payAmount, setPayAmount] = useState("");
  const [payKind, setPayKind] = useState("manual");
  const [payNote, setPayNote] = useState("");

  async function addPaymentEvent() {
    if (!selectedLoanId) return;
    setLoading(true);
    setAppError("");
    try {
      const amt = Number(payAmount);
      if (!isFinite(amt) || amt <= 0)
        throw new Error("Payment amount must be > 0.");

      const { error } = await supabase.from("payment_events").insert([
        {
          loan_id: selectedLoanId,
          paid_date: payDate,
          amount: amt,
          kind: payKind,
          note: payNote.trim() ? payNote.trim() : null,
        },
      ]);
      if (error) throw error;

      setPayAmount("");
      setPayNote("");
      await loadLoanData(selectedLoanId);
    } catch (e) {
      setAppError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deletePaymentEvent(eventId) {
    setLoading(true);
    setAppError("");
    try {
      const { error } = await supabase
        .from("payment_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      await loadLoanData(selectedLoanId);
    } catch (e) {
      setAppError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  /** ---------- Computations ---------- **/
  const normalizedRates = useMemo(() => {
    if (!loan) return [];
    return normalizeRatePeriods(ratePeriods, loan.start_date);
  }, [ratePeriods, loan]);

  const actualEvents = useMemo(
    () => buildActualEventsFromPaymentEvents(events),
    [events]
  );

  // “Actual history” schedule from recorded payments
  const actualSchedule = useMemo(() => {
    if (!loan)
      return { rows: [], totalPaid: 0, totalInterest: 0, endingBalance: 0 };
    return buildScheduleFromActualEvents({
      principal: Number(loan.principal),
      startDate: loan.start_date,
      ratePeriods: normalizedRates,
      dayCountBasis: Number(loan.day_count_basis),
      events: actualEvents,
      extraAppliesToPrincipalOnly: true,
    });
  }, [loan, normalizedRates, actualEvents]);

  const forecastSchedule = useMemo(() => {
    if (!loan)
      return {
        rows: [],
        totalPaid: 0,
        totalInterest: 0,
        endingBalance: 0,
        payoffDate: null,
      };

    // Use recorded extra payments as forecast extras (kind='extra')
    const extraOnly = (events || []).filter((e) => e.kind === "extra");

    return buildForecastScheduleFixedPayment({
      principal: Number(loan.principal),
      startDate: loan.start_date,
      amortMonths: Number(loan.amort_months),
      monthlyPayment: Number(loan.fixed_monthly_payment),
      dayCountBasis: Number(loan.day_count_basis),
      ratePeriods: normalizedRates,
      extraPayments: extraOnly.map((e) => ({
        paid_date: e.paid_date,
        amount: e.amount,
      })),
    });
  }, [loan, events, normalizedRates]);

  // Scheduled payment statuses (paid/partial/missed)
  const scheduledWithStatus = useMemo(() => {
    if (!loan) return [];
    return computeScheduledStatuses({
      scheduledPayments: scheduled,
      paymentEvents: events,
      todayDateUtc: todayUtcDateString(),
      graceDays: 15,
    });
  }, [loan, scheduled, events]);

  const missedCount = scheduledWithStatus.filter(
    (s) => s.status === "missed"
  ).length;
  const partialCount = scheduledWithStatus.filter(
    (s) => s.status === "partial"
  ).length;
  const paidCount = scheduledWithStatus.filter(
    (s) => s.status === "paid"
  ).length;

  /** ---------- CSV export (actual schedule rows) ---------- **/
  function exportActualScheduleCSV() {
    const headers = [
      "Date",
      "Type",
      "Payment",
      "InterestAccrued",
      "ToInterest",
      "ToPrincipal",
      "Balance",
      "Note",
    ];
    const rows = actualSchedule.rows.map((r) => [
      r.date,
      r.type,
      r.payment.toFixed(2),
      r.interestAccrued.toFixed(2),
      r.toInterest.toFixed(2),
      r.toPrincipal.toFixed(2),
      r.balance.toFixed(2),
      r.note ?? "",
    ]);

    exportRowsToCSV({
      filename: `loan-actual-schedule-${todayUtcDateString()}.csv`,
      headers,
      rows,
    });
  }

  /** ---------- Render ---------- **/
  if (!user) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "24px auto",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2>Loan Tracker (Supabase)</h2>
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
              onChange={(e) => setAuthEmail(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={signIn}>Sign in</button>
          <button onClick={signUp}>Sign up</button>
        </div>

        {authError && (
          <div style={{ marginTop: 12, color: "crimson" }}>{authError}</div>
        )}
      </div>
    );
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
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Loan Tracker (Supabase)</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#555" }}>{user.email}</div>
          <button onClick={signOut}>Sign out</button>
        </div>
      </div>

      {appError && (
        <div style={{ marginTop: 12, color: "crimson" }}>{appError}</div>
      )}
      {loading && <div style={{ marginTop: 12, color: "#555" }}>Loading…</div>}

      <hr style={{ margin: "16px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3>Create a new loan</h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <label>
              Name
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Principal (CAD)
              <input
                type="number"
                value={newPrincipal}
                onChange={(e) => setNewPrincipal(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Amortization (months)
              <input
                type="number"
                value={newAmortMonths}
                onChange={(e) => setNewAmortMonths(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Day-count basis
              <select
                value={newDayCount}
                onChange={(e) => setNewDayCount(Number(e.target.value))}
                style={{ width: "100%" }}
              >
                <option value={365}>365</option>
                <option value={360}>360</option>
              </select>
            </label>

            <label>
              Prime (%) (for initial rate)
              <input
                type="number"
                step="0.01"
                value={newPrimePct}
                onChange={(e) => setNewPrimePct(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, color: "#555" }}>
                Loan rate = prime − 0.25% = {pct(newLoanRateDecimal)}
              </div>
            </label>

            <label>
              Fixed monthly payment override (optional)
              <input
                type="number"
                value={newMonthlyOverride}
                onChange={(e) => setNewMonthlyOverride(e.target.value)}
                placeholder={computedNewMonthly.toFixed(2)}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, color: "#555" }}>
                Computed monthly payment: {money(computedNewMonthly)}
              </div>
            </label>
          </div>

          <button onClick={createLoan} style={{ marginTop: 10 }}>
            Create loan + schedule
          </button>
        </div>

        <div>
          <h3>Select loan</h3>
          <select
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="">-- Select --</option>
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {loan && (
            <div
              style={{ marginTop: 12, border: "1px solid #ddd", padding: 12 }}
            >
              <div>
                <strong>{loan.name}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Principal: {money(loan.principal)} | Start: {loan.start_date} |
                Fixed monthly: {money(loan.fixed_monthly_payment)}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Rates: {ratePeriods.length} | Scheduled payments:{" "}
                {scheduled.length} | Payment events: {events.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {loan && (
        <>
          <hr style={{ margin: "16px 0" }} />

          <h3>Record a payment</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 160px 160px 1fr 140px",
              gap: 8,
              alignItems: "end",
            }}
          >
            <label>
              Paid date
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Amount (CAD)
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Kind
              <select
                value={payKind}
                onChange={(e) => setPayKind(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="manual">manual</option>
                <option value="monthly">monthly</option>
                <option value="extra">extra</option>
              </select>
            </label>
            <label>
              Note (optional)
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <button onClick={addPaymentEvent}>Add</button>
          </div>

          <hr style={{ margin: "16px 0" }} />

          <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <button
              onClick={() => setTab("actual")}
              style={{ fontWeight: tab === "actual" ? 700 : 400 }}
            >
              Actual
            </button>
            <button
              onClick={() => setTab("forecast")}
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

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <h3>Scheduled payment status</h3>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 12,
                  color: "#555",
                  marginBottom: 8,
                }}
              >
                <div>Paid: {paidCount}</div>
                <div>Partial: {partialCount}</div>
                <div>Missed: {missedCount}</div>
              </div>

              <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "Due",
                        "Expected",
                        "Paid in window",
                        "Status",
                        "Window",
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
                    {scheduledWithStatus.slice(0, 18).map((s) => (
                      <tr key={s.id}>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #eee" }}
                        >
                          {s.due_date}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #eee" }}
                        >
                          {money(s.expected_amount)}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #eee" }}
                        >
                          {money(s.paid_in_window)}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #eee" }}
                        >
                          {s.status}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #eee",
                            fontSize: 12,
                            color: "#555",
                          }}
                        >
                          [{s.window_from}, {s.window_to ?? "end"}]
                        </td>
                      </tr>
                    ))}
                    {scheduledWithStatus.length > 18 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ padding: 8, fontSize: 12, color: "#555" }}
                        >
                          Showing first 18 scheduled rows. (Easy to paginate
                          later.)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {tab === "actual" ? (
              <div>
                <h3>Actual payment history</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Total paid
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(actualSchedule.totalPaid)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Total interest (accrued between payments)
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(actualSchedule.totalInterest)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Ending balance (after last recorded payment)
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(actualSchedule.endingBalance)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h4 style={{ margin: 0 }}>
                    Computed schedule from recorded payments
                  </h4>
                  <button
                    onClick={exportActualScheduleCSV}
                    disabled={!actualSchedule.rows.length}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      cursor: actualSchedule.rows.length
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    Export CSV
                  </button>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #ddd",
                    marginTop: 8,
                  }}
                >
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
                          "Actions",
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
                      {actualSchedule.rows.map((r, idx) => (
                        <tr key={idx}>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {r.date}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {r.type}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.payment)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.interestAccrued)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.toInterest)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.toPrincipal)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.balance)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                              fontSize: 12,
                              color: "#555",
                            }}
                          >
                            <span>See “Payment events” below</span>
                          </td>
                        </tr>
                      ))}
                      {!actualSchedule.rows.length && (
                        <tr>
                          <td colSpan={8} style={{ padding: 8, color: "#555" }}>
                            No recorded payments yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ marginTop: 14 }}>Payment events (raw)</h4>
                <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Paid date", "Amount", "Kind", "Note", "Actions"].map(
                          (h) => (
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
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.id}>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {ev.paid_date}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(ev.amount)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {ev.kind}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {ev.note ?? ""}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            <button
                              onClick={() => deletePaymentEvent(ev.id)}
                              style={{ fontSize: 12 }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!events.length && (
                        <tr>
                          <td colSpan={5} style={{ padding: 8, color: "#555" }}>
                            No payment events.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                  Note: Payments count for the month if paid within 15 days
                  after the due date. Missed is assessed after the grace window
                  ends.
                </div>
              </div>
            ) : (
              <div>
                <h3>Forecast</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Total paid (projected)
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(forecastSchedule.totalPaid)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Total interest (projected)
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(forecastSchedule.totalInterest)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Ending balance
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {money(forecastSchedule.endingBalance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Payoff date (projected)
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {forecastSchedule.payoffDate ?? "-"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #ddd",
                    marginTop: 8,
                  }}
                >
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
                      {forecastSchedule.rows.map((r, idx) => (
                        <tr key={idx}>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {r.date}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {r.type}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.payment)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.interestAccrued)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.toInterest)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.toPrincipal)}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {money(r.balance)}
                          </td>
                        </tr>
                      ))}
                      {!forecastSchedule.rows.length && (
                        <tr>
                          <td colSpan={7} style={{ padding: 8, color: "#555" }}>
                            No forecast rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                  Forecast includes recorded <strong>extra</strong> payments. If
                  you want to plan future extras that you have not paid yet, we
                  can add “planned extra payments” (separate table) without
                  affecting actual history.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
