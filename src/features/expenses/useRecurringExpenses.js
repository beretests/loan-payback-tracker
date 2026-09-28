import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";
import { useNotifications } from "../notifications/NotificationContext";

export function useRecurringExpenses(user, onExpensesChanged) {
  const { revision } = useFinanceRealtime();
  const notifications = useNotifications();
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase
        .from("recurring_transactions")
        .select(
          "*,expense_categories(name),financial_accounts(name,account_type,last_four)",
        )
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .is("deleted_at", null)
        .order("next_occurrence_on");
      if (loadError) throw loadError;
      setDefinitions(data ?? []);
    } catch (loadError) {
      setError(loadError.message ?? String(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  async function createDefinition(values) {
    return mutate(async () => {
      const amount = Number(values.amount);
      if (!values.description.trim()) {
        throw new Error("Description is required.");
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be greater than zero.");
      }
      if (!values.categoryId || !values.startsOn) {
        throw new Error("Category and start date are required.");
      }
      const { error: insertError } = await supabase
        .from("recurring_transactions")
        .insert([
          {
            user_id: user.id,
            category_id: values.categoryId,
            transaction_type: "expense",
            description: values.description.trim(),
            amount,
            day_of_month: Number(values.startsOn.slice(8, 10)),
            payment_method: values.paymentMethod,
            payment_account_id: values.paymentAccountId || null,
            starts_on: values.startsOn,
            next_occurrence_on: values.startsOn,
          },
        ]);
      if (insertError) throw insertError;
    }, "Recurring expense added.");
  }

  async function toggleDefinition(definition) {
    return mutate(async () => {
      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !definition.is_active })
        .eq("id", definition.id)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
    }, definition.is_active
      ? "Recurring expense paused."
      : "Recurring expense resumed.");
  }

  async function deleteDefinition(id) {
    return mutate(async () => {
      const { error: deleteError } = await supabase
        .from("recurring_transactions")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;
    }, "Recurring expense deleted.");
  }

  async function mutate(operation, successMessage) {
    setLoading(true);
    setError("");
    try {
      await operation();
      await refresh();
      await onExpensesChanged();
      notifications.success(successMessage);
      return true;
    } catch (mutationError) {
      setError(mutationError.message ?? String(mutationError));
      notifications.error(mutationError, "Recurring expense action failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    definitions,
    loading,
    error,
    createDefinition,
    toggleDefinition,
    deleteDefinition,
  };
}
