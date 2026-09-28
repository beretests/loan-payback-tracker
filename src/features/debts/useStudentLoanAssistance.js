import { useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNotifications } from "../notifications/NotificationContext";

export function useStudentLoanAssistance(user, debts, onDebtsChanged) {
  const notifications = useNotifications();
  const studentLoans = useMemo(
    () =>
      debts.filter(
        (debt) =>
          debt.user_id === user?.id && debt.debt_type === "student_loan",
      ),
    [debts, user?.id],
  );
  const [chosenDebtId, setChosenDebtId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedDebtId = studentLoans.some(
    (debt) => debt.id === chosenDebtId,
  )
    ? chosenDebtId
    : (studentLoans[0]?.id ?? "");
  const selectedDebt = studentLoans.find(
    (debt) => debt.id === selectedDebtId,
  );

  async function save(operation, successMessage) {
    setLoading(true);
    setError("");
    try {
      await operation();
      await onDebtsChanged();
      notifications.success(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError.message ?? String(saveError));
      notifications.error(saveError, "Student-loan assistance action failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function addPeriod(values) {
    return save(async () => {
      if (!selectedDebtId) throw new Error("Choose a student loan.");
      if (!values.startsOn) throw new Error("Start date is required.");
      if (values.endsOn && values.endsOn < values.startsOn) {
        throw new Error("End date cannot be before the start date.");
      }
      const requiredPayment =
        values.assistanceType === "reduced_payment"
          ? Number(values.requiredPayment)
          : null;
      if (
        values.assistanceType === "reduced_payment" &&
        (!Number.isFinite(requiredPayment) || requiredPayment < 0)
      ) {
        throw new Error("Reduced required payment must be zero or greater.");
      }
      if (
        values.assistanceType === "reduced_payment" &&
        requiredPayment > Number(selectedDebt.minimum_payment)
      ) {
        throw new Error("Reduced payment cannot exceed the regular minimum.");
      }
      const { error: insertError } = await supabase
        .from("debt_assistance_periods")
        .insert({
          loan_id: selectedDebtId,
          assistance_type: values.assistanceType,
          starts_on: values.startsOn,
          ends_on: values.endsOn || null,
          required_payment: requiredPayment,
          note: values.note.trim() || null,
          recorded_by: user.id,
        });
      if (insertError) throw insertError;
    }, "Assistance period added.");
  }

  async function deletePeriod(periodId) {
    return save(async () => {
      const { error: deleteError } = await supabase
        .from("debt_assistance_periods")
        .delete()
        .eq("id", periodId)
        .eq("loan_id", selectedDebtId);
      if (deleteError) throw deleteError;
    }, "Assistance period deleted.");
  }

  return {
    studentLoans,
    selectedDebtId,
    selectedDebt,
    loading,
    error,
    setSelectedDebtId: setChosenDebtId,
    addPeriod,
    deletePeriod,
  };
}
