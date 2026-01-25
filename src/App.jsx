import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { buildScheduledPayments } from "./scheduleGen";
import {
  buildActualEventsFromPaymentEvents,
  buildForecastScheduleFixedPayment,
  buildScheduleFromActualEvents,
  calcMonthlyPayment,
  computeScheduledStatuses,
  normalizeRatePeriods,
} from "./loanMath";
import { exportRowsToCSV } from "./csv";
import { todayUtcDateString } from "./utils/format";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import CreateLoanPage from "./pages/CreateLoanPage";
import HistoryForecastPage from "./pages/HistoryForecastPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import RecordPaymentPage from "./pages/RecordPaymentPage";
import SchedulePage from "./pages/SchedulePage";

function fmtDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthBounds(monthStr) {
  if (!monthStr) return { start: null, end: null };
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return { start: null, end: null };
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: fmtDate(start), end: fmtDate(end) };
}

export default function App() {
  /** ---------- Auth state ---------- **/
  const [session, setSession] = useState(null);
  const user = session?.user ?? null;

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState("actual"); // "actual" | "forecast"
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s ?? null),
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
        "Sign-up successful. Check email if confirmation is enabled.",
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

  /** ---------- Monthly owing summary ---------- **/
  const [monthlyOwingMonth, setMonthlyOwingMonth] = useState(
    todayUtcDateString().slice(0, 7),
  );
  const [monthlyOwingRows, setMonthlyOwingRows] = useState([]);
  const [monthlyOwingTotalScheduled, setMonthlyOwingTotalScheduled] =
    useState(0);
  const [monthlyOwingTotalPaid, setMonthlyOwingTotalPaid] = useState(0);
  const [monthlyOwingLoading, setMonthlyOwingLoading] = useState(false);
  const [monthlyOwingError, setMonthlyOwingError] = useState("");

  const refreshLoans = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("loans")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setLoans(data ?? []);
    if (data?.length) {
      setSelectedLoanId((prev) => (prev ? prev : data[0].id));
    }
  }, [user]);

  const loadLoanData = useCallback(async (loanId) => {
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
  }, []);

  useEffect(() => {
    refreshLoans().catch((e) => setAppError(e.message ?? String(e)));
  }, [refreshLoans]);

  useEffect(() => {
    if (!user || !selectedLoanId) return;
    loadLoanData(selectedLoanId);
  }, [user, selectedLoanId, loadLoanData]);

  useEffect(() => {
    if (!user) return;
    const { start, end } = monthBounds(monthlyOwingMonth);
    if (!start || !end) {
      setMonthlyOwingRows([]);
      setMonthlyOwingTotalScheduled(0);
      setMonthlyOwingTotalPaid(0);
      return;
    }
    if (!loans.length) {
      setMonthlyOwingRows([]);
      setMonthlyOwingTotalScheduled(0);
      setMonthlyOwingTotalPaid(0);
      return;
    }

    let isActive = true;
    setMonthlyOwingLoading(true);
    setMonthlyOwingError("");

    const loadMonthlyTotals = async () => {
      try {
        const [schedR, paidR] = await Promise.all([
          supabase
            .from("scheduled_payments")
            .select("loan_id, expected_amount, due_date")
            .gte("due_date", start)
            .lt("due_date", end),
          supabase
            .from("payment_events")
            .select("loan_id, amount, paid_date")
            .gte("paid_date", start)
            .lt("paid_date", end),
        ]);

        if (schedR.error) throw schedR.error;
        if (paidR.error) throw paidR.error;
        if (!isActive) return;

        const scheduledByLoan = new Map();
        for (const row of schedR.data ?? []) {
          const loanId = row.loan_id;
          const amt = Number(row.expected_amount);
          if (!isFinite(amt)) continue;
          scheduledByLoan.set(
            loanId,
            (scheduledByLoan.get(loanId) ?? 0) + amt,
          );
        }

        const paidByLoan = new Map();
        for (const row of paidR.data ?? []) {
          const loanId = row.loan_id;
          const amt = Number(row.amount);
          if (!isFinite(amt)) continue;
          paidByLoan.set(loanId, (paidByLoan.get(loanId) ?? 0) + amt);
        }

        const rows = loans.map((l) => ({
          id: l.id,
          name: l.name,
          amountDue: scheduledByLoan.get(l.id) ?? 0,
          amountPaid: paidByLoan.get(l.id) ?? 0,
        }));
        const totalScheduled = rows.reduce((sum, r) => sum + r.amountDue, 0);
        const totalPaid = rows.reduce((sum, r) => sum + r.amountPaid, 0);

        setMonthlyOwingRows(rows);
        setMonthlyOwingTotalScheduled(totalScheduled);
        setMonthlyOwingTotalPaid(totalPaid);
      } catch (e) {
        if (!isActive) return;
        setMonthlyOwingError(e.message ?? String(e));
      } finally {
        if (isActive) setMonthlyOwingLoading(false);
      }
    };

    loadMonthlyTotals();

    return () => {
      isActive = false;
    };
  }, [user, monthlyOwingMonth, loans]);

  /** ---------- Create loan form ---------- **/
  const [newName, setNewName] = useState("");
  const [newPrincipal, setNewPrincipal] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newAmortMonths, setNewAmortMonths] = useState("");
  const [newDayCount, setNewDayCount] = useState("");

  // Prime input as percent; convert to loan annual decimal = prime%/100 - 0.0025
  const [newPrimePct, setNewPrimePct] = useState("");
  const newLoanRateDecimal = useMemo(() => {
    const primePct = Number(newPrimePct);
    return isFinite(primePct) ? primePct / 100 - 0.0025 : NaN;
  }, [newPrimePct]);

  const computedNewMonthly = useMemo(() => {
    const principal = Number(newPrincipal);
    const amortMonths = Number(newAmortMonths);
    if (
      !isFinite(principal) ||
      !isFinite(newLoanRateDecimal) ||
      !isFinite(amortMonths) ||
      principal <= 0 ||
      amortMonths <= 0
    )
      return NaN;
    return calcMonthlyPayment(principal, Number(newLoanRateDecimal), amortMonths);
  }, [newPrincipal, newLoanRateDecimal, newAmortMonths]);

  const [newMonthlyOverride, setNewMonthlyOverride] = useState("");
  const newFixedMonthlyPayment = useMemo(() => {
    if (newMonthlyOverride.trim() !== "") return Number(newMonthlyOverride);
    return computedNewMonthly;
  }, [newMonthlyOverride, computedNewMonthly]);

  async function createLoan() {
    if (!user) return;
    setLoading(true);
    setAppError("");
    try {
      const name = newName.trim();
      const principal = Number(newPrincipal);
      const amortMonths = Number(newAmortMonths);
      const dayCount = Number(newDayCount);
      const monthlyPayment = Number(newFixedMonthlyPayment);

      if (!name) throw new Error("Loan name is required.");
      if (!newStartDate) throw new Error("Start date is required.");
      if (!isFinite(principal) || principal <= 0)
        throw new Error("Principal must be a positive number.");
      if (!isFinite(amortMonths) || amortMonths <= 0)
        throw new Error("Amortization months must be a positive number.");
      if (![360, 365].includes(dayCount))
        throw new Error("Day-count basis must be 360 or 365.");
      if (!isFinite(newLoanRateDecimal))
        throw new Error("Prime rate must be provided.");
      if (!isFinite(monthlyPayment) || monthlyPayment <= 0)
        throw new Error("Monthly payment must be a positive number.");

      // 1) Create loan
      const { data: created, error: loanErr } = await supabase
        .from("loans")
        .insert([
          {
            user_id: user.id,
            name,
            principal,
            start_date: newStartDate,
            amort_months: amortMonths,
            day_count_basis: dayCount,
            fixed_monthly_payment: monthlyPayment,
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
        amortMonths,
        monthlyPayment,
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
    [events],
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
    (s) => s.status === "missed",
  ).length;
  const partialCount = scheduledWithStatus.filter(
    (s) => s.status === "partial",
  ).length;
  const paidCount = scheduledWithStatus.filter(
    (s) => s.status === "paid",
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
      <AuthPanel
        authEmail={authEmail}
        authPassword={authPassword}
        authError={authError}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    );
  }

  const navItems = [
    { to: "/", label: "Home", end: true },
    { to: "/create", label: "Create loan" },
    { to: "/record", label: "Record payment" },
    { to: "/schedule", label: "Payment schedule" },
    { to: "/history", label: "History & forecast" },
  ];

  return (
    <div className="app-shell">
      <AppHeader
        title="Loan Payment Tracker"
        userEmail={user.email}
        onSignOut={signOut}
      />

      {appError && (
        <div style={{ marginTop: 12, color: "crimson" }}>{appError}</div>
      )}
      {loading && <div style={{ marginTop: 12, color: "#555" }}>Loading...</div>}

      <nav className={`app-nav${navOpen ? " app-nav--open" : ""}`}>
        <button
          className="nav-toggle"
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-expanded={navOpen}
          aria-controls="app-nav-links"
        >
          {navOpen ? "Close menu" : "Menu"}
        </button>
        <div className="nav-links" id="app-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              monthlyOwingMonth={monthlyOwingMonth}
              monthlyOwingRows={monthlyOwingRows}
              monthlyOwingTotalScheduled={monthlyOwingTotalScheduled}
              monthlyOwingTotalPaid={monthlyOwingTotalPaid}
              monthlyOwingLoading={monthlyOwingLoading}
              monthlyOwingError={monthlyOwingError}
              onMonthChange={setMonthlyOwingMonth}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreateLoanPage
              newName={newName}
              newPrincipal={newPrincipal}
              newStartDate={newStartDate}
              newAmortMonths={newAmortMonths}
              newDayCount={newDayCount}
              newPrimePct={newPrimePct}
              newMonthlyOverride={newMonthlyOverride}
              computedNewMonthly={computedNewMonthly}
              newLoanRateDecimal={newLoanRateDecimal}
              onNameChange={setNewName}
              onPrincipalChange={setNewPrincipal}
              onStartDateChange={setNewStartDate}
              onAmortMonthsChange={setNewAmortMonths}
              onDayCountChange={setNewDayCount}
              onPrimePctChange={setNewPrimePct}
              onMonthlyOverrideChange={setNewMonthlyOverride}
              onCreateLoan={createLoan}
            />
          }
        />
        <Route
          path="/record"
          element={
            <RecordPaymentPage
              loans={loans}
              selectedLoanId={selectedLoanId}
              loan={loan}
              ratePeriods={ratePeriods}
              scheduled={scheduled}
              events={events}
              onSelectLoan={setSelectedLoanId}
              payDate={payDate}
              payAmount={payAmount}
              payKind={payKind}
              payNote={payNote}
              onPayDateChange={setPayDate}
              onPayAmountChange={setPayAmount}
              onPayKindChange={setPayKind}
              onPayNoteChange={setPayNote}
              onAddPayment={addPaymentEvent}
            />
          }
        />
        <Route
          path="/schedule"
          element={
            <SchedulePage
              loans={loans}
              selectedLoanId={selectedLoanId}
              loan={loan}
              ratePeriods={ratePeriods}
              scheduled={scheduled}
              events={events}
              onSelectLoan={setSelectedLoanId}
              scheduledWithStatus={scheduledWithStatus}
              paidCount={paidCount}
              partialCount={partialCount}
              missedCount={missedCount}
            />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryForecastPage
              loans={loans}
              selectedLoanId={selectedLoanId}
              loan={loan}
              ratePeriods={ratePeriods}
              scheduled={scheduled}
              events={events}
              onSelectLoan={setSelectedLoanId}
              tab={tab}
              onTabChange={setTab}
              actualSchedule={actualSchedule}
              forecastSchedule={forecastSchedule}
              onExportCSV={exportActualScheduleCSV}
              onDeleteEvent={deletePaymentEvent}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
