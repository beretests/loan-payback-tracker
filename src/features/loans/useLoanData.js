import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useFinanceRealtime } from "../realtime/FinanceRealtimeContext";
import { useNotifications } from "../notifications/NotificationContext";

export function useLoanData(user) {
  const { revision } = useFinanceRealtime();
  const notifications = useNotifications();
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [loan, setLoan] = useState(null);
  const [ratePeriods, setRatePeriods] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [events, setEvents] = useState([]);
  const [charges, setCharges] = useState([]);
  const [assistancePeriods, setAssistancePeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");

  const refreshLoans = useCallback(async () => {
    if (!user) return;
    const userEmail = user.email?.toLowerCase() ?? "";
    const sharedResult = userEmail
      ? await supabase
          .from("loan_shares")
          .select("loan_id")
          .eq("invited_email", userEmail)
      : { data: [], error: null };
    if (sharedResult.error) throw sharedResult.error;
    const sharedIds = (sharedResult.data ?? []).map((row) => row.loan_id);

    let query = supabase
      .from("loans")
      .select(
        "id,name,created_at,user_id,fixed_monthly_payment,principal,start_date,debt_type,minimum_payment,credit_limit,due_day,debt_assistance_periods(*)",
      )
      .order("created_at", { ascending: false });
    query = sharedIds.length
      ? query.or(`user_id.eq.${user.id},id.in.(${sharedIds.join(",")})`)
      : query.eq("user_id", user.id);

    const { data, error } = await query;
    if (error) throw error;
    setLoans(data ?? []);
    if (data?.length) {
      setSelectedLoanId((current) => current || data[0].id);
    }
  }, [user]);

  const loadLoanData = useCallback(async (loanId) => {
    setLoading(true);
    setAppError("");
    try {
      const [
        loanResult,
        ratesResult,
        scheduleResult,
        eventsResult,
        chargesResult,
        assistanceResult,
      ] = await Promise.all([
          supabase.from("loans").select("*").eq("id", loanId).single(),
          supabase
            .from("rate_periods")
            .select("*")
            .eq("loan_id", loanId)
            .order("effective_date"),
          supabase
            .from("scheduled_payments")
            .select("*")
            .eq("loan_id", loanId)
            .order("due_date"),
          supabase
            .from("payment_events")
            .select("*")
            .eq("loan_id", loanId)
            .order("paid_date"),
          supabase
            .from("debt_charges")
            .select("*")
            .eq("loan_id", loanId)
            .order("charged_on"),
          supabase
            .from("debt_assistance_periods")
            .select("*")
            .eq("loan_id", loanId)
            .order("starts_on"),
        ]);

      if (loanResult.error) throw loanResult.error;
      if (ratesResult.error) throw ratesResult.error;
      if (scheduleResult.error) throw scheduleResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (chargesResult.error) throw chargesResult.error;
      if (assistanceResult.error) throw assistanceResult.error;

      setLoan(loanResult.data);
      setRatePeriods(ratesResult.data ?? []);
      setScheduled(scheduleResult.data ?? []);
      setEvents(eventsResult.data ?? []);
      setCharges(chargesResult.data ?? []);
      setAssistancePeriods(assistanceResult.data ?? []);
    } catch (error) {
      setAppError(error.message ?? String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLoans().catch((error) =>
      setAppError(error.message ?? String(error)),
    );
  }, [refreshLoans, revision]);

  useEffect(() => {
    if (user && selectedLoanId) loadLoanData(selectedLoanId);
  }, [user, selectedLoanId, loadLoanData]);

  async function addLoanShare() {
    if (!selectedLoanId) {
      notifications.error("Select a debt before inviting a participant.");
      return;
    }
    const email = shareEmail.trim().toLowerCase();
    if (!email) {
      setShareError("Invite email is required.");
      notifications.error("Invite email is required.");
      return;
    }

    setShareLoading(true);
    setShareError("");
    try {
      const { error } = await supabase.from("loan_shares").insert([
        { loan_id: selectedLoanId, invited_email: email },
      ]);
      if (error) throw error;
      setShareEmail("");
      notifications.success(`Debt shared with ${email}.`);
    } catch (error) {
      setShareError(error.message ?? String(error));
      notifications.error(error, "Could not share debt.");
    } finally {
      setShareLoading(false);
    }
  }

  return {
    loans,
    selectedLoanId,
    setSelectedLoanId,
    loan,
    ratePeriods,
    scheduled,
    events,
    charges,
    assistancePeriods,
    loading,
    setLoading,
    appError,
    setAppError,
    refreshLoans,
    loadLoanData,
    shareEmail,
    setShareEmail,
    shareLoading,
    shareError,
    addLoanShare,
  };
}
