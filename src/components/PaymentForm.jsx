export default function PaymentForm({
  payDate,
  payAmount,
  payKind,
  payNote,
  onPayDateChange,
  onPayAmountChange,
  onPayKindChange,
  onPayNoteChange,
  onAddPayment,
}) {
  return (
    <>
      <h3>Record a payment</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 160px 160px 1fr 140px",
          gap: 8,
          alignItems: "end",
        }}
      >
        <label>
          Paid date
          <input
            type="date"
            value={payDate}
            onChange={(e) => onPayDateChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Amount (CAD)
          <input
            type="number"
            value={payAmount}
            onChange={(e) => onPayAmountChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Kind
          <select
            value={payKind}
            onChange={(e) => onPayKindChange(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="manual">manual</option>
            <option value="monthly">monthly</option>
            <option value="extra">extra</option>
          </select>
        </label>
        <label>
          Note (optional)
          <input
            value={payNote}
            onChange={(e) => onPayNoteChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <button onClick={onAddPayment}>Add</button>
      </div>
    </>
  );
}
