import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import HomePage from "../pages/HomePage";
import CreateLoanPage from "../pages/CreateLoanPage";
import RecordPaymentPage from "../pages/RecordPaymentPage";
import SchedulePage from "../pages/SchedulePage";
import HistoryForecastPage from "../pages/HistoryForecastPage";
import NotFoundPage from "../pages/NotFoundPage";
import { useMonthlyOwing } from "../features/dashboard/useMonthlyOwing";
import { useCreateLoan } from "../features/loans/useCreateLoan";
import { useLoanCalculations } from "../features/loans/useLoanCalculations";
import { useLoanData } from "../features/loans/useLoanData";
import { usePayments } from "../features/payments/usePayments";
import AppNavigation from "./AppNavigation";

export default function AuthenticatedApp({ user, onSignOut }) {
  const [historyTab, setHistoryTab] = useState("actual");
  const loans = useLoanData(user);
  const monthly = useMonthlyOwing(user, loans.loans);
  const createLoan = useCreateLoan({
    user,
    refreshLoans: loans.refreshLoans,
    selectLoan: loans.setSelectedLoanId,
    setLoading: loans.setLoading,
    setAppError: loans.setAppError,
  });
  const payments = usePayments({
    user,
    loans: loans.loans,
    selectedLoanId: loans.selectedLoanId,
    refreshLoans: loans.refreshLoans,
    loadLoanData: loans.loadLoanData,
    setLoading: loans.setLoading,
    setAppError: loans.setAppError,
  });
  const calculations = useLoanCalculations({
    loan: loans.loan,
    ratePeriods: loans.ratePeriods,
    scheduled: loans.scheduled,
    events: loans.events,
  });

  const loanContextProps = {
    loans: loans.loans,
    selectedLoanId: loans.selectedLoanId,
    loan: loans.loan,
    ratePeriods: loans.ratePeriods,
    scheduled: loans.scheduled,
    events: loans.events,
    onSelectLoan: loans.setSelectedLoanId,
    currentUserId: user.id,
    shareEmail: loans.shareEmail,
    shareLoading: loans.shareLoading,
    shareError: loans.shareError,
    onShareEmailChange: loans.setShareEmail,
    onAddShare: loans.addLoanShare,
  };

  return (
    <div className="app-shell">
      <AppHeader
        title="Loan Payment Tracker"
        userEmail={user.email}
        onSignOut={onSignOut}
      />

      {loans.appError && (
        <div style={{ marginTop: 12, color: "crimson" }}>{loans.appError}</div>
      )}
      {loans.loading && (
        <div style={{ marginTop: 12, color: "#555" }}>Loading...</div>
      )}

      <AppNavigation />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              monthlyOwingMonth={monthly.month}
              monthlyOwingRows={monthly.rows}
              monthlyOwingTotalScheduled={monthly.totalScheduled}
              monthlyOwingTotalPaid={monthly.totalPaid}
              monthlyOwingLoading={monthly.loading}
              monthlyOwingError={monthly.error}
              onMonthChange={monthly.setMonth}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreateLoanPage
              newName={createLoan.newName}
              newPrincipal={createLoan.newPrincipal}
              newStartDate={createLoan.newStartDate}
              newAmortMonths={createLoan.newAmortMonths}
              newDayCount={createLoan.newDayCount}
              newPrimePct={createLoan.newPrimePct}
              newMonthlyOverride={createLoan.newMonthlyOverride}
              computedNewMonthly={createLoan.computedNewMonthly}
              newLoanRateDecimal={createLoan.newLoanRateDecimal}
              onNameChange={createLoan.setNewName}
              onPrincipalChange={createLoan.setNewPrincipal}
              onStartDateChange={createLoan.setNewStartDate}
              onAmortMonthsChange={createLoan.setNewAmortMonths}
              onDayCountChange={createLoan.setNewDayCount}
              onPrimePctChange={createLoan.setNewPrimePct}
              onMonthlyOverrideChange={createLoan.setNewMonthlyOverride}
              onCreateLoan={createLoan.createLoan}
            />
          }
        />
        <Route
          path="/record"
          element={
            <RecordPaymentPage
              {...loanContextProps}
              payDate={payments.payDate}
              payAmount={payments.payAmount}
              payKind={payments.payKind}
              payNote={payments.payNote}
              onPayDateChange={payments.setPayDate}
              onPayAmountChange={payments.setPayAmount}
              onPayKindChange={payments.setPayKind}
              onPayNoteChange={payments.setPayNote}
              onAddPayment={payments.addPaymentEvent}
              paymentLoading={loans.loading}
              onAddLumpSumPayment={payments.addLumpSumPayment}
            />
          }
        />
        <Route
          path="/schedule"
          element={
            <SchedulePage
              {...loanContextProps}
              scheduledWithStatus={calculations.scheduledWithStatus}
              paidCount={calculations.paidCount}
              partialCount={calculations.partialCount}
              missedCount={calculations.missedCount}
            />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryForecastPage
              {...loanContextProps}
              tab={historyTab}
              onTabChange={setHistoryTab}
              actualSchedule={calculations.actualSchedule}
              forecastSchedule={calculations.forecastSchedule}
              onExportCSV={calculations.exportActualScheduleCSV}
              onDeleteEvent={payments.deletePaymentEvent}
            />
          }
        />
        <Route path="/reset-password" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
