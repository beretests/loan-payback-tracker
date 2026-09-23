import { useMemo } from "react";
import {
  buildActualEventsFromPaymentEvents,
  buildForecastScheduleFixedPayment,
  buildScheduleFromActualEvents,
  computeScheduledStatuses,
  normalizeRatePeriods,
} from "../../loanMath";
import { exportRowsToCSV } from "../../csv";
import { todayUtcDateString } from "../../utils/format";

export function useLoanCalculations({ loan, ratePeriods, scheduled, events }) {
  const normalizedRates = useMemo(
    () => (loan ? normalizeRatePeriods(ratePeriods, loan.start_date) : []),
    [ratePeriods, loan],
  );
  const actualEvents = useMemo(
    () => buildActualEventsFromPaymentEvents(events),
    [events],
  );
  const actualSchedule = useMemo(() => {
    if (!loan) {
      return { rows: [], totalPaid: 0, totalInterest: 0, endingBalance: 0 };
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
      extraPayments: events
        .filter((event) => event.kind === "extra")
        .map((event) => ({
          paid_date: event.paid_date,
          amount: event.amount,
        })),
    });
  }, [loan, events, normalizedRates]);

  const scheduledWithStatus = useMemo(
    () =>
      loan
        ? computeScheduledStatuses({
            scheduledPayments: scheduled,
            paymentEvents: events,
            todayDateUtc: todayUtcDateString(),
            graceDays: 15,
          })
        : [],
    [loan, scheduled, events],
  );

  function exportActualScheduleCSV() {
    exportRowsToCSV({
      filename: `loan-actual-schedule-${todayUtcDateString()}.csv`,
      headers: [
        "Date",
        "Type",
        "Payment",
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
    exportActualScheduleCSV,
  };
}

function countStatus(rows, status) {
  return rows.filter((row) => row.status === status).length;
}
