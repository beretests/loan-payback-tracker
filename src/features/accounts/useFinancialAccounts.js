import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

const LINKABLE_DEBT_TYPES = ["credit_card", "line_of_credit"];

export function useFinancialAccounts(user) {
  const { revision } = useFinanceRealtime();
  const [accounts, setAccounts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [accountResult, debtResult] = await Promise.all([
        supabase
          .from("financial_accounts")
          .select("id,name,account_type,institution,last_four,linked_loan_id")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("loans")
          .select("id,name,debt_type")
          .eq("user_id", user.id)
          .in("debt_type", LINKABLE_DEBT_TYPES)
          .order("name"),
      ]);
      if (accountResult.error) throw accountResult.error;
      if (debtResult.error) throw debtResult.error;

      const ownedDebts = debtResult.data ?? [];
      setDebts(ownedDebts);
      setAccounts(
        (accountResult.data ?? []).map((account) => ({
          ...account,
          linkedDebt: ownedDebts.find((debt) => debt.id === account.linked_loan_id),
        })),
      );
    } catch (loadError) {
      setError(loadError.message ?? String(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  function createAccount(values) {
    return save(async () => {
      const { error: insertError } = await supabase
        .from("financial_accounts")
        .insert([{ ...normalizeAccount(values), user_id: user.id }]);
      if (insertError) throw insertError;
    });
  }

  function updateAccount(id, values) {
    return save(async () => {
      const { error: updateError } = await supabase
        .from("financial_accounts")
        .update(normalizeAccount(values))
        .eq("id", id)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
    });
  }

  function archiveAccount(id) {
    return save(async () => {
      const { error: archiveError } = await supabase
        .from("financial_accounts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (archiveError) throw archiveError;
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
    accounts,
    debts,
    loading,
    error,
    refresh,
    createAccount,
    updateAccount,
    archiveAccount,
  };
}

function normalizeAccount(values) {
  const name = values.name.trim();
  const institution = values.institution.trim();
  const lastFour = values.lastFour.trim();
  const isDebtAccount = LINKABLE_DEBT_TYPES.includes(values.accountType);

  if (!name) throw new Error("Account name is required.");
  if (lastFour && !/^\d{4}$/.test(lastFour)) {
    throw new Error("Last four must contain exactly four digits.");
  }

  return {
    name,
    account_type: values.accountType,
    institution: institution || null,
    last_four: lastFour || null,
    linked_loan_id: isDebtAccount && values.linkedLoanId
      ? values.linkedLoanId
      : null,
  };
}
