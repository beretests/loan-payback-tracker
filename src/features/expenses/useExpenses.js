import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

const DEFAULT_CATEGORIES = [
  ["Housing", "#2563eb"],
  ["Groceries", "#16a34a"],
  ["Transportation", "#ea580c"],
  ["Children", "#9333ea"],
  ["Subscriptions", "#0891b2"],
  ["Discretionary", "#db2777"],
];

export function useExpenses(user) {
  const { revision } = useFinanceRealtime();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { error: materializeError } = await supabase.rpc(
        "materialize_recurring_expenses",
        { target_date: new Date().toISOString().slice(0, 10) },
      );
      if (materializeError) throw materializeError;

      let categoryResult = await supabase
        .from("expense_categories")
        .select("id,name,color,is_default")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("name");
      if (categoryResult.error) throw categoryResult.error;

      if (!categoryResult.data?.length) {
        const { error: seedError } = await supabase
          .from("expense_categories")
          .insert(
            DEFAULT_CATEGORIES.map(([name, color]) => ({
              user_id: user.id,
              name,
              color,
              is_default: true,
            })),
          );
        if (seedError && seedError.code !== "23505") throw seedError;
        categoryResult = await supabase
          .from("expense_categories")
          .select("id,name,color,is_default")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("name");
        if (categoryResult.error) throw categoryResult.error;
      }

      const expenseResult = await supabase
        .from("expenses")
        .select(
          "*,expense_categories(name,color),financial_accounts(name,account_type,last_four)",
        )
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (expenseResult.error) throw expenseResult.error;

      setCategories(categoryResult.data ?? []);
      setExpenses(expenseResult.data ?? []);
    } catch (loadError) {
      setError(loadError.message ?? String(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  async function createExpense(values) {
    return save(async () => {
      const expense = normalizeExpense(values);
      const { error: insertError } = await supabase.from("expenses").insert([
        { ...expense, user_id: user.id, expense_type: "ordinary" },
      ]);
      if (insertError) throw insertError;
    });
  }

  async function updateExpense(id, values) {
    return save(async () => {
      const { error: updateError } = await supabase
        .from("expenses")
        .update(normalizeExpense(values))
        .eq("id", id)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
    });
  }

  async function deleteExpense(id) {
    return save(async () => {
      const { error: deleteError } = await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;
    });
  }

  async function save(operation) {
    setLoading(true);
    setError("");
    try {
      await operation();
      await refresh();
      return true;
    } catch (saveError) {
      setError(saveError.message ?? String(saveError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    categories,
    expenses,
    loading,
    error,
    refresh,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}

function normalizeExpense(values) {
  const description = values.description.trim();
  const amount = Number(values.amount);
  if (!description) throw new Error("Description is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  if (!values.categoryId) throw new Error("Category is required.");
  if (!values.spentOn) throw new Error("Date is required.");

  return {
    category_id: values.categoryId,
    description,
    amount,
    spent_on: values.spentOn,
    payment_method: values.paymentMethod,
    payment_account_id: values.paymentAccountId || null,
    notes: values.notes.trim() || null,
  };
}
