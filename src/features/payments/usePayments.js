import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { allocateLumpSumPayment } from "../../paymentAllocation";
import { todayUtcDateString } from "../../utils/format";

export function usePayments({
  user,
  loans,
  selectedLoanId,
  refreshLoans,
  loadLoanData,
  setLoading,
  setAppError,
}) {
  const [payDate, setPayDate] = useState(todayUtcDateString());
  const [payAmount, setPayAmount] = useState("");
  const [payKind, setPayKind] = useState("manual");
  const [payNote, setPayNote] = useState("");

  async function addPaymentEvent() {
    if (!selectedLoanId) return;
    setLoading(true);
    setAppError("");
    try {
      const amount = Number(payAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be > 0.");
      }

      const { error } = await supabase.from("payment_events").insert([
        {
          loan_id: selectedLoanId,
          paid_date: payDate,
          amount,
          kind: payKind,
          note: payNote.trim() || null,
          recorded_by: user.id,
        },
      ]);
      if (error) throw error;
      setPayAmount("");
      setPayNote("");
      await loadLoanData(selectedLoanId);
    } catch (error) {
      setAppError(error.message ?? String(error));
    } finally {
      setLoading(false);
    }
  }

  async function addLumpSumPayment({
    paidDate,
    amount,
    selectedLoanIds,
    extraLoanId,
    note,
  }) {
    if (!user) return false;
    setLoading(true);
    setAppError("");
    try {
      if (!paidDate) throw new Error("Paid date is required.");
      const selectedIds = new Set(selectedLoanIds);
      const selectedLoans = loans.filter(
        (candidate) =>
          selectedIds.has(candidate.id) && candidate.user_id === user.id,
      );
      if (selectedLoans.length !== selectedIds.size) {
        throw new Error("One or more selected loans cannot be edited.");
      }

      const allocation = allocateLumpSumPayment({
        amount,
        selectedLoans,
        extraLoanId,
      });
      const trimmedNote = note.trim();
      const regularNote = trimmedNote
        ? `Lump-sum payment — ${trimmedNote}`
        : "Lump-sum payment";
      const extraNote = trimmedNote
        ? `Lump-sum remainder — ${trimmedNote}`
        : "Lump-sum remainder";
      const paymentRows = allocation.regularAllocations.map((item) => ({
        loan_id: item.loanId,
        paid_date: paidDate,
        amount: item.amount,
        kind: "monthly",
        note: regularNote,
        recorded_by: user.id,
      }));
      if (allocation.extraAllocation) {
        paymentRows.push({
          loan_id: allocation.extraAllocation.loanId,
          paid_date: paidDate,
          amount: allocation.extraAllocation.amount,
          kind: "extra",
          note: extraNote,
          recorded_by: user.id,
        });
      }

      const { error } = await supabase
        .from("payment_events")
        .insert(paymentRows);
      if (error) throw error;
      await refreshLoans();
      if (selectedLoanId) await loadLoanData(selectedLoanId);
      return true;
    } catch (error) {
      setAppError(error.message ?? String(error));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function deletePaymentEvent(eventId) {
    setLoading(true);
    setAppError("");
    try {
      const { error } = await supabase
        .from("payment_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      await loadLoanData(selectedLoanId);
    } catch (error) {
      setAppError(error.message ?? String(error));
    } finally {
      setLoading(false);
    }
  }

  return {
    payDate,
    payAmount,
    payKind,
    payNote,
    setPayDate,
    setPayAmount,
    setPayKind,
    setPayNote,
    addPaymentEvent,
    addLumpSumPayment,
    deletePaymentEvent,
  };
}
