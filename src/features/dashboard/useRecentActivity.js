import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

export function useRecentActivity(user) {
  const { revision } = useFinanceRealtime();
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      const [expenseResult, incomeResult, paymentResult, chargeResult] =
        await Promise.all([
        supabase
          .from("expenses")
          .select("id,description,amount,spent_on")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("spent_on", { ascending: false })
          .limit(5),
        supabase
          .from("income_entries")
          .select("id,source,amount,received_on")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("received_on", { ascending: false })
          .limit(5),
        supabase
          .from("payment_events")
          .select("id,amount,paid_date,loans(name)")
          .order("paid_date", { ascending: false })
          .limit(5),
        supabase
          .from("debt_charges")
          .select("id,amount,charged_on,charge_type,loans(name)")
          .order("charged_on", { ascending: false })
          .limit(5),
      ]);
      if (!active) return;
      const rows = [
        ...(expenseResult.data ?? []).map((row) => ({
          id: `expense-${row.id}`,
          date: row.spent_on,
          label: row.description,
          type: "Expense",
          amount: -Number(row.amount),
        })),
        ...(incomeResult.data ?? []).map((row) => ({
          id: `income-${row.id}`,
          date: row.received_on,
          label: row.source,
          type: "Income",
          amount: Number(row.amount),
        })),
        ...(paymentResult.data ?? []).map((row) => ({
          id: `payment-${row.id}`,
          date: row.paid_date,
          label: row.loans?.name ?? "Debt payment",
          type: "Debt payment",
          amount: -Number(row.amount),
        })),
        ...(chargeResult.data ?? []).map((row) => ({
          id: `charge-${row.id}`,
          date: row.charged_on,
          label: row.loans?.name ?? "Debt finance charge",
          type: row.charge_type === "fee" ? "Debt fee" : "Interest charged",
          amount: -Number(row.amount),
        })),
      ];
      setActivity(
        rows
          .sort((left, right) => right.date.localeCompare(left.date))
          .slice(0, 8),
      );
    }

    load();
    return () => {
      active = false;
    };
  }, [user, revision]);

  return activity;
}
