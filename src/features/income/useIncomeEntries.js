import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

export function useIncomeEntries(user) {
  const { revision } = useFinanceRealtime();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase
        .from("income_entries")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("received_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (loadError) throw loadError;
      setEntries(data ?? []);
    } catch (loadError) {
      setError(loadError.message ?? String(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  async function createEntry(values) {
    return save(async () => {
      const { error: insertError } = await supabase.from("income_entries").insert([
        { ...normalize(values), user_id: user.id },
      ]);
      if (insertError) throw insertError;
    });
  }

  async function updateEntry(id, values) {
    return save(async () => {
      const { error: updateError } = await supabase
        .from("income_entries")
        .update(normalize(values))
        .eq("id", id)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
    });
  }

  async function deleteEntry(id) {
    return save(async () => {
      const { error: deleteError } = await supabase
        .from("income_entries")
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

  return { entries, loading, error, createEntry, updateEntry, deleteEntry };
}

function normalize(values) {
  const source = values.source.trim();
  const amount = Number(values.amount);
  if (!source) throw new Error("Income source is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  if (!values.receivedOn) throw new Error("Received date is required.");
  return {
    source,
    amount,
    received_on: values.receivedOn,
    notes: values.notes.trim() || null,
  };
}
