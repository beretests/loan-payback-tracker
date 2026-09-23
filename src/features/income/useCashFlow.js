import { useEffect, useState } from "react";
import { monthBounds } from "../dashboard/monthRange";
import { supabase } from "../../supabaseClient";

export function useCashFlow(user, month) {
  const [summary, setSummary] = useState({
    income: 0,
    spending: 0,
    available: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const { start, end } = monthBounds(month);
    if (!user || !start || !end) return;
    let active = true;

    async function load() {
      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("income_entries")
          .select("amount")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("received_on", start)
          .lt("received_on", end),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("spent_on", start)
          .lt("spent_on", end),
      ]);
      if (!active) return;
      const loadError = incomeResult.error ?? expenseResult.error;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      const income = sum(incomeResult.data);
      const spending = sum(expenseResult.data);
      setSummary({ income, spending, available: income - spending });
      setError("");
    }

    load();
    return () => {
      active = false;
    };
  }, [user, month]);

  return { ...summary, error };
}

function sum(rows = []) {
  return rows.reduce((total, row) => total + Number(row.amount || 0), 0);
}
