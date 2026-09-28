import { useCallback, useEffect, useState } from "react";
import {
  buildActualEventsFromDebtLedger,
  buildScheduleFromActualEvents,
  normalizeRatePeriods,
} from "../../loanMath";
import { supabase } from "../../supabaseClient";
import { todayUtcDateString } from "../../utils/format";
import { nextDueDate, summarizeDebts } from "./debtDashboard";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";
import {
  applyInterestFreePeriods,
  rateForDate,
  requiredPaymentForDate,
} from "./studentLoanAssistance";

export function useDebtDashboard(user) {
  const { revision } = useFinanceRealtime();
  const [debts, setDebts] = useState([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error: loadError } = await supabase
      .from("loans")
      .select(
        "*,rate_periods(*),payment_events(*),debt_charges(*),debt_assistance_periods(*)",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }

    const today = todayUtcDateString();
    setDebts(
      (data ?? []).map((debt) => {
        const baseRates = normalizeRatePeriods(
          debt.rate_periods ?? [],
          debt.start_date,
        );
        const rates = applyInterestFreePeriods(
          baseRates,
          debt.debt_assistance_periods ?? [],
          debt.start_date,
        );
        const actual = buildScheduleFromActualEvents({
          principal: Number(debt.principal),
          startDate: debt.start_date,
          ratePeriods: rates,
          dayCountBasis: Number(debt.day_count_basis),
          events: buildActualEventsFromDebtLedger(
            debt.payment_events ?? [],
            debt.debt_charges ?? [],
          ),
          extraAppliesToPrincipalOnly: true,
        });
        const effectiveMinimumPayment = requiredPaymentForDate(debt, today);
        return {
          ...debt,
          currentBalance: actual.endingBalance,
          currentAnnualRate: rateForDate(rates, today),
          baseCurrentAnnualRate: rateForDate(baseRates, today),
          effectiveMinimumPayment,
          nextDueDate: nextDueDate(debt.due_day, today),
          yourContributions: (debt.payment_events ?? [])
            .filter((event) => event.recorded_by === user.id)
            .reduce((sum, event) => sum + Number(event.amount || 0), 0),
          sharedContributions: (debt.payment_events ?? [])
            .filter(
              (event) =>
                event.recorded_by && event.recorded_by !== user.id,
            )
            .reduce((sum, event) => sum + Number(event.amount || 0), 0),
        };
      }),
    );
    setError("");
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, revision]);

  return { debts, summary: summarizeDebts(debts), error, refresh };
}
