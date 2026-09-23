import { useCallback, useEffect, useState } from "react";
import {
  buildActualEventsFromPaymentEvents,
  buildScheduleFromActualEvents,
  normalizeRatePeriods,
} from "../../loanMath";
import { supabase } from "../../supabaseClient";
import { todayUtcDateString } from "../../utils/format";
import { nextDueDate, summarizeDebts } from "./debtDashboard";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

export function useDebtDashboard(user) {
  const { revision } = useFinanceRealtime();
  const [debts, setDebts] = useState([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error: loadError } = await supabase
      .from("loans")
      .select("*,rate_periods(*),payment_events(*)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }

    const today = todayUtcDateString();
    setDebts(
      (data ?? []).map((debt) => {
        const rates = normalizeRatePeriods(
          debt.rate_periods ?? [],
          debt.start_date,
        );
        const actual = buildScheduleFromActualEvents({
          principal: Number(debt.principal),
          startDate: debt.start_date,
          ratePeriods: rates,
          dayCountBasis: Number(debt.day_count_basis),
          events: buildActualEventsFromPaymentEvents(
            debt.payment_events ?? [],
          ),
          extraAppliesToPrincipalOnly: true,
        });
        const currentRate = [...rates]
          .reverse()
          .find((rate) => rate.effective_date <= today);
        return {
          ...debt,
          currentBalance: actual.endingBalance,
          currentAnnualRate: Number(currentRate?.annual_rate ?? 0),
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
