import { useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { calcMonthlyPayment } from "../../loanMath";
import { buildScheduledPayments } from "../../scheduleGen";
import {
  effectiveAnnualRate,
  percentToDecimal,
} from "../debts/debtInterest";
import { useNotifications } from "../notifications/NotificationContext";

export function useCreateLoan({
  user,
  refreshLoans,
  selectLoan,
  setLoading,
  setAppError,
}) {
  const notifications = useNotifications();
  const [newName, setNewName] = useState("");
  const [newPrincipal, setNewPrincipal] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newAmortMonths, setNewAmortMonths] = useState("");
  const [newDayCount, setNewDayCount] = useState("");
  const [newRateType, setNewRateType] = useState("fixed");
  const [newAnnualRatePct, setNewAnnualRatePct] = useState("");
  const [newPrimePct, setNewPrimePct] = useState("");
  const [newPrimeSpreadPct, setNewPrimeSpreadPct] = useState("");
  const [newIsPromotional, setNewIsPromotional] = useState(false);
  const [newPromoEndsOn, setNewPromoEndsOn] = useState("");
  const [newPostPromoRatePct, setNewPostPromoRatePct] = useState("");
  const [newMonthlyOverride, setNewMonthlyOverride] = useState("");
  const [newDebtType, setNewDebtType] = useState("personal_loan");
  const [newMinimumPayment, setNewMinimumPayment] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newDueDay, setNewDueDay] = useState("");

  const newLoanRateDecimal = useMemo(() => {
    return effectiveAnnualRate({
      rateType: newRateType,
      annualRatePct: newAnnualRatePct,
      primeRatePct: newPrimePct,
      spreadPct: newPrimeSpreadPct,
    });
  }, [
    newAnnualRatePct,
    newPrimePct,
    newPrimeSpreadPct,
    newRateType,
  ]);

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
    if (!user) {
      notifications.error("Sign in before creating a debt.");
      return;
    }
    setLoading(true);
    setAppError("");
    try {
      const name = newName.trim();
      const principal = Number(newPrincipal);
      const amortMonths = Number(newAmortMonths);
      const dayCount = Number(newDayCount);
      const monthlyPayment = Number(newFixedMonthlyPayment);
      const minimumPayment =
        newMinimumPayment.trim() === ""
          ? monthlyPayment
          : Number(newMinimumPayment);
      const creditLimit =
        newCreditLimit.trim() === "" ? null : Number(newCreditLimit);
      const dueDay = Number(newDueDay);
      const primeRate =
        newRateType === "variable" ? percentToDecimal(newPrimePct) : null;
      const primeSpread =
        newRateType === "variable"
          ? percentToDecimal(newPrimeSpreadPct)
          : null;
      const postPromoRate = newIsPromotional
        ? percentToDecimal(newPostPromoRatePct)
        : null;

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
        throw new Error("A valid interest rate must be provided.");
      }
      if (newLoanRateDecimal < 0) {
        throw new Error("The effective APR cannot be negative.");
      }
      if (
        newIsPromotional &&
        (!newPromoEndsOn ||
          newPromoEndsOn < newStartDate ||
          !Number.isFinite(postPromoRate) ||
          postPromoRate < 0)
      ) {
        throw new Error(
          "Promotional rates need a valid expiry and follow-on APR.",
        );
      }
      if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
        throw new Error("Monthly payment must be a positive number.");
      }
      if (!Number.isFinite(minimumPayment) || minimumPayment < 0) {
        throw new Error("Minimum payment must be zero or greater.");
      }
      if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit <= 0)) {
        throw new Error("Credit limit must be a positive number.");
      }
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error("Due day must be between 1 and 31.");
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
            debt_type: newDebtType,
            minimum_payment: minimumPayment,
            credit_limit: creditLimit,
            due_day: dueDay,
            rate_type: newRateType,
            prime_spread: primeSpread,
            promo_rate_ends_on: newIsPromotional ? newPromoEndsOn : null,
            post_promo_annual_rate: postPromoRate,
          },
        ])
        .select()
        .single();
      if (loanError) throw loanError;

      const { error: rateError } = await supabase.rpc("record_debt_rate", {
        p_loan_id: created.id,
        p_effective_date: newStartDate,
        p_rate_type: newRateType,
        p_annual_rate: newLoanRateDecimal,
        p_prime_rate: primeRate,
        p_spread: primeSpread,
        p_is_promotional: newIsPromotional,
        p_promo_ends_on: newIsPromotional ? newPromoEndsOn : null,
        p_post_promo_annual_rate: postPromoRate,
        p_note: "Initial rate",
      });
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
      notifications.success(`${name} was created successfully.`);
    } catch (error) {
      setAppError(error.message ?? String(error));
      notifications.error(error, "Could not create debt.");
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
    newRateType,
    newAnnualRatePct,
    newPrimePct,
    newPrimeSpreadPct,
    newIsPromotional,
    newPromoEndsOn,
    newPostPromoRatePct,
    newMonthlyOverride,
    computedNewMonthly,
    newLoanRateDecimal,
    newDebtType,
    newMinimumPayment,
    newCreditLimit,
    newDueDay,
    setNewName,
    setNewPrincipal,
    setNewStartDate,
    setNewAmortMonths,
    setNewDayCount,
    setNewRateType,
    setNewAnnualRatePct,
    setNewPrimePct,
    setNewPrimeSpreadPct,
    setNewIsPromotional,
    setNewPromoEndsOn,
    setNewPostPromoRatePct,
    setNewMonthlyOverride,
    setNewDebtType,
    setNewMinimumPayment,
    setNewCreditLimit,
    setNewDueDay,
    createLoan,
  };
}
