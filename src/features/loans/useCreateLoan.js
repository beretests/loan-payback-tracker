import { useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { calcMonthlyPayment } from "../../loanMath";
import { buildScheduledPayments } from "../../scheduleGen";

export function useCreateLoan({
  user,
  refreshLoans,
  selectLoan,
  setLoading,
  setAppError,
}) {
  const [newName, setNewName] = useState("");
  const [newPrincipal, setNewPrincipal] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newAmortMonths, setNewAmortMonths] = useState("");
  const [newDayCount, setNewDayCount] = useState("");
  const [newPrimePct, setNewPrimePct] = useState("");
  const [newMonthlyOverride, setNewMonthlyOverride] = useState("");

  const newLoanRateDecimal = useMemo(() => {
    const primePercent = Number(newPrimePct);
    return Number.isFinite(primePercent)
      ? primePercent / 100 - 0.0025
      : Number.NaN;
  }, [newPrimePct]);

  const computedNewMonthly = useMemo(() => {
    const principal = Number(newPrincipal);
    const amortMonths = Number(newAmortMonths);
    if (
      !Number.isFinite(principal) ||
      !Number.isFinite(newLoanRateDecimal) ||
      !Number.isFinite(amortMonths) ||
      principal <= 0 ||
      amortMonths <= 0
    ) {
      return Number.NaN;
    }
    return calcMonthlyPayment(principal, newLoanRateDecimal, amortMonths);
  }, [newPrincipal, newLoanRateDecimal, newAmortMonths]);

  const newFixedMonthlyPayment = useMemo(
    () =>
      newMonthlyOverride.trim() !== ""
        ? Number(newMonthlyOverride)
        : computedNewMonthly,
    [newMonthlyOverride, computedNewMonthly],
  );

  async function createLoan() {
    if (!user) return;
    setLoading(true);
    setAppError("");
    try {
      const name = newName.trim();
      const principal = Number(newPrincipal);
      const amortMonths = Number(newAmortMonths);
      const dayCount = Number(newDayCount);
      const monthlyPayment = Number(newFixedMonthlyPayment);

      if (!name) throw new Error("Loan name is required.");
      if (!newStartDate) throw new Error("Start date is required.");
      if (!Number.isFinite(principal) || principal <= 0) {
        throw new Error("Principal must be a positive number.");
      }
      if (!Number.isFinite(amortMonths) || amortMonths <= 0) {
        throw new Error("Amortization months must be a positive number.");
      }
      if (![360, 365].includes(dayCount)) {
        throw new Error("Day-count basis must be 360 or 365.");
      }
      if (!Number.isFinite(newLoanRateDecimal)) {
        throw new Error("Prime rate must be provided.");
      }
      if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
        throw new Error("Monthly payment must be a positive number.");
      }

      const { data: created, error: loanError } = await supabase
        .from("loans")
        .insert([
          {
            user_id: user.id,
            name,
            principal,
            start_date: newStartDate,
            amort_months: amortMonths,
            day_count_basis: dayCount,
            fixed_monthly_payment: monthlyPayment,
          },
        ])
        .select()
        .single();
      if (loanError) throw loanError;

      const { error: rateError } = await supabase.from("rate_periods").insert([
        {
          loan_id: created.id,
          effective_date: newStartDate,
          annual_rate: newLoanRateDecimal,
        },
      ]);
      if (rateError) throw rateError;

      const scheduleRows = buildScheduledPayments(
        newStartDate,
        amortMonths,
        monthlyPayment,
      ).map((row) => ({ ...row, loan_id: created.id }));
      const { error: scheduleError } = await supabase
        .from("scheduled_payments")
        .insert(scheduleRows);
      if (scheduleError) throw scheduleError;

      await refreshLoans();
      selectLoan(created.id);
    } catch (error) {
      setAppError(error.message ?? String(error));
    } finally {
      setLoading(false);
    }
  }

  return {
    newName,
    newPrincipal,
    newStartDate,
    newAmortMonths,
    newDayCount,
    newPrimePct,
    newMonthlyOverride,
    computedNewMonthly,
    newLoanRateDecimal,
    setNewName,
    setNewPrincipal,
    setNewStartDate,
    setNewAmortMonths,
    setNewDayCount,
    setNewPrimePct,
    setNewMonthlyOverride,
    createLoan,
  };
}
