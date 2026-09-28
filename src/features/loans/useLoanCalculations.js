import { useMemo } from "react";
import {
  buildActualEventsFromDebtLedger,
  buildForecastScheduleFixedPayment,
  buildScheduleFromActualEvents,
  computeScheduledStatuses,
  normalizeRatePeriods,
} from "../../loanMath";
import { exportRowsToCSV } from "../../csv";
import { todayUtcDateString } from "../../utils/format";
import {
  applyInterestFreePeriods,
  requiredPaymentForDate,
} from "../debts/studentLoanAssistance";

export function useLoanCalculations({
  loan,
  ratePeriods,
  scheduled,
  events,
  charges,
  assistancePeriods,
}) {
  const normalizedRates = useMemo(() => {
    if (!loan) return [];
    return applyInterestFreePeriods(
      normalizeRatePeriods(ratePeriods, loan.start_date),
      assistancePeriods,
      loan.start_date,
    );
  }, [ratePeriods, assistancePeriods, loan]);
  const assistedLoan = useMemo(
    () =>
      loan
        ? { ...loan, debt_assistance_periods: assistancePeriods }
        : null,
    [loan, assistancePeriods],
  );
  const actualEvents = useMemo(
    () => buildActualEventsFromDebtLedger(events, charges),
    [events, charges],
  );
  const actualSchedule = useMemo(() => {
    if (!loan) {
      return {
        rows: [],
        totalPaid: 0,
        totalInterest: 0,
        totalFees: 0,
        endingBalance: 0,
      };
    }
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
    if (!loan) {
      return {
        rows: [],
        totalPaid: 0,
        totalInterest: 0,
        endingBalance: 0,
        payoffDate: null,
      };
    }
    return buildForecastScheduleFixedPayment({
      principal: Number(loan.principal),
      startDate: loan.start_date,
      amortMonths: Number(loan.amort_months),
      monthlyPayment: Number(loan.fixed_monthly_payment),
      dayCountBasis: Number(loan.day_count_basis),
      ratePeriods: normalizedRates,
      paymentForDate: (date) =>
        requiredPaymentForDate(
          assistedLoan,
          date,
          Number(loan.fixed_monthly_payment),
        ),
      extraPayments: events
        .filter((event) => event.kind === "extra")
        .map((event) => ({
          paid_date: event.paid_date,
          amount: event.amount,
        })),
    });
  }, [loan, events, normalizedRates, assistedLoan]);

  const scheduledWithStatus = useMemo(
    () =>
      loan
        ? computeScheduledStatuses({
            scheduledPayments: scheduled.map((payment) => ({
              ...payment,
              expected_amount: requiredPaymentForDate(
                assistedLoan,
                payment.due_date,
                Number(payment.expected_amount),
              ),
            })),
            paymentEvents: events,
            todayDateUtc: todayUtcDateString(),
            graceDays: 15,
          })
        : [],
    [loan, scheduled, events, assistedLoan],
  );

  function exportActualScheduleCSV() {
    exportRowsToCSV({
      filename: `loan-actual-schedule-${todayUtcDateString()}.csv`,
      headers: [
        "Date",
        "Type",
        "Payment",
        "PostedCharge",
        "InterestAccrued",
        "ToInterest",
        "ToPrincipal",
        "Balance",
        "Note",
      ],
      rows: actualSchedule.rows.map((row) => [
        row.date,
        row.type,
        row.payment.toFixed(2),
        (row.type.endsWith("_charge") ? row.amount : 0).toFixed(2),
        row.interestAccrued.toFixed(2),
        row.toInterest.toFixed(2),
        row.toPrincipal.toFixed(2),
        row.balance.toFixed(2),
        row.note ?? "",
      ]),
    });
  }

  return {
    actualSchedule,
    forecastSchedule,
    scheduledWithStatus,
    paidCount: countStatus(scheduledWithStatus, "paid"),
    partialCount: countStatus(scheduledWithStatus, "partial"),
    missedCount: countStatus(scheduledWithStatus, "missed"),
    notRequiredCount: countStatus(scheduledWithStatus, "not_required"),
    exportActualScheduleCSV,
  };
}

function countStatus(rows, status) {
  return rows.filter((row) => row.status === status).length;
}
