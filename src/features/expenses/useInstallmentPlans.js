import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";
import { useNotifications } from "../notifications/NotificationContext";
import { buildInstallmentSchedule } from "./installmentSchedule";

export function useInstallmentPlans(user, onExpensesChanged) {
  const { revision } = useFinanceRealtime();
  const notifications = useNotifications();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from("expense_installment_plans")
        .select(
          "*,expense_categories(name),financial_accounts(name,account_type,last_four),expense_installments(*)",
        )
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("first_due_on", { ascending: false });
      if (loadError) throw loadError;
      setPlans(data ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError.message ?? String(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  async function mutate(operation, successMessage) {
    setLoading(true);
    setError("");
    try {
      await operation();
      await Promise.all([refresh(), onExpensesChanged()]);
      notifications.success(successMessage);
      return true;
    } catch (mutationError) {
      setError(mutationError.message ?? String(mutationError));
      notifications.error(mutationError, "Installment plan action failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function createPlan(values) {
    return mutate(async () => {
      const description = values.description.trim();
      if (!description) throw new Error("Description is required.");
      if (!values.categoryId) throw new Error("Category is required.");
      const schedule = buildInstallmentSchedule(values);
      const totalAmount = Number(values.totalAmount);
      const installmentCount = Number(values.installmentCount);
      const { error: createError } = await supabase.rpc(
        "create_expense_installment_plan",
        {
          p_description: description,
          p_total_amount: totalAmount,
          p_installment_count: installmentCount,
          p_first_due_on: values.firstDueOn,
          p_frequency: values.frequency,
          p_category_id: values.categoryId,
          p_payment_method: values.paymentMethod,
          p_payment_account_id: values.paymentAccountId || null,
          p_notes: values.notes,
          p_schedule: schedule,
        },
      );
      if (createError) throw createError;
    }, "Installment plan created.");
  }

  async function markPaid(installmentId, paidOn) {
    return mutate(async () => {
      if (!paidOn) throw new Error("Paid date is required.");
      const { error: payError } = await supabase.rpc(
        "pay_expense_installment",
        {
          p_installment_id: installmentId,
          p_paid_on: paidOn,
        },
      );
      if (payError) throw payError;
    }, "Installment marked paid and added to expenses.");
  }

  async function undoPayment(installmentId) {
    return mutate(async () => {
      const { error: undoError } = await supabase.rpc(
        "undo_expense_installment_payment",
        { p_installment_id: installmentId },
      );
      if (undoError) throw undoError;
    }, "Installment payment undone.");
  }

  async function cancelPlan(planId) {
    return mutate(async () => {
      const { error: cancelError } = await supabase.rpc(
        "cancel_expense_installment_plan",
        { p_plan_id: planId },
      );
      if (cancelError) throw cancelError;
    }, "Remaining installments cancelled.");
  }

  return {
    plans,
    loading,
    error,
    createPlan,
    markPaid,
    undoPayment,
    cancelPlan,
  };
}
