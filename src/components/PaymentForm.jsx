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
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Kind
            <span
              className="tooltip"
              aria-label="Payment type definitions"
            >
              i
              <span className="tooltip__bubble">
                <strong>manual</strong>: regular payment (treated like monthly)
                <br />
                <strong>monthly</strong>: scheduled payment
                <br />
                <strong>extra</strong>: additional principal-only payment
              </span>
            </span>
          </span>
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
