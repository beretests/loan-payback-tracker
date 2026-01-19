import React, { useEffect, useMemo, useState } from "react";
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
import ActualHistorySection from "./components/ActualHistorySection";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import CreateLoanForm from "./components/CreateLoanForm";
import ForecastSection from "./components/ForecastSection";
import LoanSelector from "./components/LoanSelector";
import PaymentForm from "./components/PaymentForm";
import ScheduledStatusTable from "./components/ScheduledStatusTable";
import TabSwitcher from "./components/TabSwitcher";

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
    [newPrimePct],
  );

  const computedNewMonthly = useMemo(() => {
    return calcMonthlyPayment(
      Number(newPrincipal),
      Number(newLoanRateDecimal),
      Number(newAmortMonths),
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
        Number(newFixedMonthlyPayment),
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
      <AppHeader
        title="Loan Payment Tracker"
        userEmail={user.email}
        onSignOut={signOut}
      />

      {appError && (
        <div style={{ marginTop: 12, color: "crimson" }}>{appError}</div>
      )}
      {loading && <div style={{ marginTop: 12, color: "#555" }}>Loading...</div>}

      <hr style={{ margin: "16px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <CreateLoanForm
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
        <LoanSelector
          loans={loans}
          selectedLoanId={selectedLoanId}
          loan={loan}
          ratePeriods={ratePeriods}
          scheduled={scheduled}
          events={events}
          onSelectLoan={setSelectedLoanId}
        />
      </div>

      {loan && (
        <>
          <hr style={{ margin: "16px 0" }} />

          <PaymentForm
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

          <hr style={{ margin: "16px 0" }} />

          <TabSwitcher tab={tab} onTabChange={setTab} />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <ScheduledStatusTable
              scheduledWithStatus={scheduledWithStatus}
              paidCount={paidCount}
              partialCount={partialCount}
              missedCount={missedCount}
            />
            {tab === "actual" ? (
              <ActualHistorySection
                actualSchedule={actualSchedule}
                events={events}
                onExportCSV={exportActualScheduleCSV}
                onDeleteEvent={deletePaymentEvent}
              />
            ) : (
              <ForecastSection forecastSchedule={forecastSchedule} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
