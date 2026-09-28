import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { percentToDecimal, validateDebtRate } from "./debtInterest";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";

export function useDebtInterest(user, debts, onDebtsChanged) {
  const { revision } = useFinanceRealtime();
  const ownedDebts = useMemo(
    () => debts.filter((debt) => debt.user_id === user?.id),
    [debts, user?.id],
  );
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeDebtId = ownedDebts.some((debt) => debt.id === selectedDebtId)
    ? selectedDebtId
    : (ownedDebts[0]?.id ?? "");

  const refreshCharges = useCallback(async () => {
    const debtIds = ownedDebts.map((debt) => debt.id);
    if (!debtIds.length) {
      setCharges([]);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("debt_charges")
      .select("*")
      .in("loan_id", debtIds)
      .order("charged_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setCharges(data ?? []);
    setError("");
  }, [ownedDebts]);

  useEffect(() => {
    refreshCharges();
  }, [refreshCharges, revision]);

  async function save(operation) {
    setLoading(true);
    setError("");
    try {
      await operation();
      await Promise.all([refreshCharges(), onDebtsChanged()]);
      return true;
    } catch (saveError) {
      setError(saveError.message ?? String(saveError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function recordRate(values) {
    return save(async () => {
      const annualRate = validateDebtRate(values);
      const { error: rateError } = await supabase.rpc("record_debt_rate", {
        p_loan_id: values.debtId,
        p_effective_date: values.effectiveDate,
        p_rate_type: values.rateType,
        p_annual_rate: annualRate,
        p_prime_rate:
          values.rateType === "variable"
            ? percentToDecimal(values.primeRatePct)
            : null,
        p_spread:
          values.rateType === "variable"
            ? percentToDecimal(values.spreadPct)
            : null,
        p_is_promotional: values.isPromotional,
        p_promo_ends_on: values.isPromotional ? values.promoEndsOn : null,
        p_post_promo_annual_rate: values.isPromotional
          ? percentToDecimal(values.postPromoAnnualRatePct)
          : null,
        p_note: values.note,
      });
      if (rateError) throw rateError;
    });
  }

  async function deleteRate(rateId) {
    return save(async () => {
      const { error: deleteError } = await supabase
        .from("rate_periods")
        .delete()
        .eq("id", rateId)
        .eq("loan_id", activeDebtId);
      if (deleteError) throw deleteError;
    });
  }

  async function recordCharge(values) {
    return save(async () => {
      const amount = Number(values.amount);
      if (!values.debtId) throw new Error("Choose a debt.");
      if (!values.chargedOn) throw new Error("Charge date is required.");
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Charge amount must be greater than zero.");
      }
      const { error: chargeError } = await supabase.from("debt_charges").insert({
        loan_id: values.debtId,
        charged_on: values.chargedOn,
        amount,
        charge_type: values.chargeType,
        note: values.note.trim() || null,
        recorded_by: user.id,
      });
      if (chargeError) throw chargeError;
    });
  }

  async function deleteCharge(chargeId) {
    return save(async () => {
      const { error: deleteError } = await supabase
        .from("debt_charges")
        .delete()
        .eq("id", chargeId)
        .eq("loan_id", activeDebtId);
      if (deleteError) throw deleteError;
    });
  }

  return {
    ownedDebts,
    selectedDebtId: activeDebtId,
    selectedDebt: ownedDebts.find((debt) => debt.id === activeDebtId),
    charges: charges.filter((charge) => charge.loan_id === activeDebtId),
    loading,
    error,
    setSelectedDebtId,
    recordRate,
    deleteRate,
    recordCharge,
    deleteCharge,
  };
}
