import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { todayUtcDateString } from "../../utils/format";
import { monthBounds } from "./monthRange";

export function useMonthlyOwing(user, loans) {
  const [month, setMonth] = useState(todayUtcDateString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const { start, end } = monthBounds(month);
    if (!start || !end || !loans.length) {
      setRows([]);
      setTotalScheduled(0);
      setTotalPaid(0);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    async function loadTotals() {
      try {
        const [scheduleResult, paidResult] = await Promise.all([
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
        if (scheduleResult.error) throw scheduleResult.error;
        if (paidResult.error) throw paidResult.error;
        if (!active) return;

        const scheduledByLoan = sumByLoan(
          scheduleResult.data,
          "expected_amount",
        );
        const paidByLoan = sumByLoan(paidResult.data, "amount");
        const nextRows = loans.map((loan) => ({
          id: loan.id,
          name: loan.name,
          amountDue: scheduledByLoan.get(loan.id) ?? 0,
          amountPaid: paidByLoan.get(loan.id) ?? 0,
        }));

        setRows(nextRows);
        setTotalScheduled(
          nextRows.reduce((sum, row) => sum + row.amountDue, 0),
        );
        setTotalPaid(
          nextRows.reduce((sum, row) => sum + row.amountPaid, 0),
        );
      } catch (loadError) {
        if (active) setError(loadError.message ?? String(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTotals();
    return () => {
      active = false;
    };
  }, [user, month, loans]);

  return {
    month,
    setMonth,
    rows,
    totalScheduled,
    totalPaid,
    loading,
    error,
  };
}

function sumByLoan(rows = [], amountField) {
  const totals = new Map();
  for (const row of rows) {
    const amount = Number(row[amountField]);
    if (!Number.isFinite(amount)) continue;
    totals.set(row.loan_id, (totals.get(row.loan_id) ?? 0) + amount);
  }
  return totals;
}
