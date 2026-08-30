import { useMemo, useState } from "react";
import { allocateLumpSumPayment } from "../paymentAllocation";
import { money } from "../utils/format";

export default function LumpSumPaymentForm({
  loans,
  currentUserId,
  defaultDate,
  loading,
  onAddLumpSumPayment,
}) {
  const eligibleLoans = useMemo(
    () => loans.filter((loan) => loan.user_id === currentUserId),
    [loans, currentUserId],
  );
  const [selectedLoanIds, setSelectedLoanIds] = useState([]);
  const [paidDate, setPaidDate] = useState(defaultDate);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [extraLoanId, setExtraLoanId] = useState("");
  const [formError, setFormError] = useState("");

  const selectedLoans = eligibleLoans.filter((loan) =>
    selectedLoanIds.includes(loan.id),
  );
  const effectiveExtraLoanId = selectedLoanIds.includes(extraLoanId)
    ? extraLoanId
    : (selectedLoanIds[0] ?? "");

  const preview = useMemo(() => {
    if (!amount || !selectedLoans.length) return null;
    try {
      return allocateLumpSumPayment({
        amount,
        selectedLoans,
        extraLoanId: effectiveExtraLoanId,
      });
    } catch {
      return null;
    }
  }, [amount, selectedLoans, effectiveExtraLoanId]);

  function toggleLoan(loanId) {
    setSelectedLoanIds((current) =>
      current.includes(loanId)
        ? current.filter((id) => id !== loanId)
        : [...current, loanId],
    );
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    if (!paidDate) {
      setFormError("Paid date is required.");
      return;
    }

    try {
      allocateLumpSumPayment({
        amount,
        selectedLoans,
        extraLoanId: effectiveExtraLoanId,
      });
      const saved = await onAddLumpSumPayment({
        paidDate,
        amount,
        selectedLoanIds,
        extraLoanId: effectiveExtraLoanId,
        note,
      });
      if (saved) {
        setAmount("");
        setNote("");
      }
    } catch (error) {
      setFormError(error.message ?? String(error));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Record a lump-sum payment</h3>
      <p className="form-help">
        Select loans to split the payment across their monthly amounts. Any
        remainder is recorded as an extra principal payment.
      </p>

      <div className="lump-sum-fields">
        <label>
          Paid date
          <input
            type="date"
            value={paidDate}
            onChange={(event) => setPaidDate(event.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Total amount (CAD)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Note (optional)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={loading}
          />
        </label>
      </div>

      <fieldset className="lump-sum-loans" disabled={loading}>
        <legend>Loans to pay</legend>
        {eligibleLoans.length ? (
          eligibleLoans.map((loan) => (
            <label className="lump-sum-loan" key={loan.id}>
              <input
                type="checkbox"
                checked={selectedLoanIds.includes(loan.id)}
                onChange={() => toggleLoan(loan.id)}
              />
              <span>{loan.name}</span>
              <span>{money(loan.fixed_monthly_payment)} monthly</span>
            </label>
          ))
        ) : (
          <div className="form-help">No editable loans are available.</div>
        )}
      </fieldset>

      {preview?.extraAllocation && (
        <label className="lump-sum-extra-target">
          Apply {money(preview.extraAllocation.amount)} extra to
          <select
            value={effectiveExtraLoanId}
            onChange={(event) => setExtraLoanId(event.target.value)}
            disabled={loading}
          >
            {selectedLoans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {preview && (
        <div className="lump-sum-preview" aria-live="polite">
          <strong>Payment split</strong>
          <ul>
            {preview.regularAllocations.map((allocation) => (
              <li key={allocation.loanId}>
                {allocation.loanName}: {money(allocation.amount)} regular
              </li>
            ))}
            {preview.extraAllocation && (
              <li>
                {preview.extraAllocation.loanName}:{" "}
                {money(preview.extraAllocation.amount)} extra
              </li>
            )}
          </ul>
          <div>Total: {money(preview.totalAllocated)}</div>
        </div>
      )}

      {formError && (
        <div className="auth-status auth-status--error" role="alert">
          {formError}
        </div>
      )}

      <button type="submit" disabled={loading || !eligibleLoans.length}>
        {loading ? "Recording…" : "Record lump sum"}
      </button>
    </form>
  );
}
