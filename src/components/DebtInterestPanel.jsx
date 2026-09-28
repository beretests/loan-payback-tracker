import { useMemo, useState } from "react";
import {
  decimalToPercent,
  effectiveAnnualRate,
} from "../features/debts/debtInterest";
import { useDebtInterest } from "../features/debts/useDebtInterest";
import { money, pct, todayUtcDateString } from "../utils/format";

function initialRateForm() {
  return {
    effectiveDate: todayUtcDateString(),
    rateType: "",
    annualRatePct: "",
    primeRatePct: "",
    spreadPct: "",
    isPromotional: false,
    promoEndsOn: "",
    postPromoAnnualRatePct: "",
    note: "",
  };
}

function initialChargeForm() {
  return {
    chargedOn: todayUtcDateString(),
    amount: "",
    chargeType: "interest",
    note: "",
  };
}

export default function DebtInterestPanel({ user, debts, onDebtsChanged }) {
  const interest = useDebtInterest(user, debts, onDebtsChanged);
  const [rateForm, setRateForm] = useState(() => initialRateForm());
  const [chargeForm, setChargeForm] = useState(() => initialChargeForm());

  const rateHistory = useMemo(
    () =>
      [...(interest.selectedDebt?.rate_periods ?? [])].sort((a, b) =>
        b.effective_date.localeCompare(a.effective_date),
      ),
    [interest.selectedDebt],
  );

  function updateRate(field, value) {
    setRateForm((current) => ({ ...current, [field]: value }));
  }

  function updateCharge(field, value) {
    setChargeForm((current) => ({ ...current, [field]: value }));
  }

  function selectDebt(debtId) {
    const debt = interest.ownedDebts.find((candidate) => candidate.id === debtId);
    interest.setSelectedDebtId(debtId);
    setRateForm((current) => ({
      ...current,
      rateType: debt?.rate_type ?? "fixed",
      spreadPct: decimalToPercent(debt?.prime_spread),
    }));
  }

  async function submitRate(event) {
    event.preventDefault();
    if (
      await interest.recordRate({
        ...rateForm,
        debtId: interest.selectedDebtId,
      })
    ) {
      setRateForm((current) => ({
        ...initialRateForm(),
        rateType: current.rateType,
      }));
    }
  }

  async function submitCharge(event) {
    event.preventDefault();
    if (
      await interest.recordCharge({
        ...chargeForm,
        debtId: interest.selectedDebtId,
      })
    ) {
      setChargeForm(initialChargeForm());
    }
  }

  if (!interest.ownedDebts.length) {
    return (
      <section className="panel" id="rate-history">
        <h3>Interest and fees</h3>
        <p className="form-help">
          Only a debt owner can change rates or post statement charges.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="panel" id="rate-history">
        <div className="section-heading">
          <div>
            <h3>Interest-rate history</h3>
            <p>
              Record APR changes on their effective dates for accurate forecasts.
            </p>
          </div>
          <DebtSelector interest={interest} onSelect={selectDebt} />
        </div>

        <form className="interest-form" onSubmit={submitRate}>
          <label>
            Rate type
            <select
              value={rateForm.rateType}
              onChange={(event) => updateRate("rateType", event.target.value)}
              required
            >
              <option value="">Choose rate type</option>
              <option value="fixed">Fixed APR</option>
              <option value="variable">Variable — prime + spread</option>
              <option value="interest_free">Interest-free</option>
            </select>
          </label>
          <label>
            Effective date
            <input
              type="date"
              value={rateForm.effectiveDate}
              onChange={(event) =>
                updateRate("effectiveDate", event.target.value)
              }
              required
            />
          </label>
          {rateForm.rateType === "fixed" && (
            <label>
              APR (%)
              <input
                type="number"
                min="0"
                step="0.001"
                value={rateForm.annualRatePct}
                onChange={(event) =>
                  updateRate("annualRatePct", event.target.value)
                }
                required
              />
            </label>
          )}
          {rateForm.rateType === "variable" && (
            <>
              <label>
                Prime rate (%)
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={rateForm.primeRatePct}
                  onChange={(event) =>
                    updateRate("primeRatePct", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Spread (%)
                <input
                  type="number"
                  step="0.001"
                  value={rateForm.spreadPct}
                  onChange={(event) =>
                    updateRate("spreadPct", event.target.value)
                  }
                  required
                />
              </label>
            </>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rateForm.isPromotional}
              onChange={(event) =>
                updateRate("isPromotional", event.target.checked)
              }
            />
            Promotional rate
          </label>
          {rateForm.isPromotional && (
            <>
              <label>
                Promotion ends
                <input
                  type="date"
                  value={rateForm.promoEndsOn}
                  onChange={(event) =>
                    updateRate("promoEndsOn", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                APR after promotion (%)
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={rateForm.postPromoAnnualRatePct}
                  onChange={(event) =>
                    updateRate("postPromoAnnualRatePct", event.target.value)
                  }
                  required
                />
              </label>
            </>
          )}
          <label className="interest-form__note">
            Note
            <input
              value={rateForm.note}
              onChange={(event) => updateRate("note", event.target.value)}
              placeholder="Statement or lender notice"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={interest.loading}>
              Record rate
            </button>
            <span className="form-help">
              Effective APR: {pct(effectiveAnnualRate(rateForm))}
            </span>
          </div>
        </form>

        <RateHistory
          rates={rateHistory}
          loading={interest.loading}
          onDelete={interest.deleteRate}
        />
      </section>

      <section className="panel" id="finance-charges">
        <div className="section-heading">
          <div>
            <h3>Posted interest and fees</h3>
            <p>
              Statement charges increase the debt balance without becoming
              ordinary expenses.
            </p>
          </div>
        </div>
        <form className="interest-form" onSubmit={submitCharge}>
          <label>
            Date
            <input
              type="date"
              value={chargeForm.chargedOn}
              onChange={(event) =>
                updateCharge("chargedOn", event.target.value)
              }
              required
            />
          </label>
          <label>
            Type
            <select
              value={chargeForm.chargeType}
              onChange={(event) =>
                updateCharge("chargeType", event.target.value)
              }
            >
              <option value="interest">Interest</option>
              <option value="fee">Fee</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={chargeForm.amount}
              onChange={(event) => updateCharge("amount", event.target.value)}
              required
            />
          </label>
          <label className="interest-form__note">
            Note
            <input
              value={chargeForm.note}
              onChange={(event) => updateCharge("note", event.target.value)}
              placeholder="September statement"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={interest.loading}>
              Post charge
            </button>
          </div>
        </form>

        <ChargeHistory
          charges={interest.charges}
          loading={interest.loading}
          onDelete={interest.deleteCharge}
        />
        {interest.error && (
          <div className="auth-status auth-status--error" role="alert">
            {interest.error}
          </div>
        )}
      </section>
    </>
  );
}

function DebtSelector({ interest, onSelect }) {
  return (
    <label>
      Debt
      <select
        value={interest.selectedDebtId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {interest.ownedDebts.map((debt) => (
          <option key={debt.id} value={debt.id}>
            {debt.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function RateHistory({ rates, loading, onDelete }) {
  return (
    <div className="table-wrap interest-history-table">
      <table className="data-table">
        <thead>
          <tr>
            <th className="data-table__head">Effective</th>
            <th className="data-table__head">APR</th>
            <th className="data-table__head">Basis</th>
            <th className="data-table__head">Note</th>
            <th className="data-table__head">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <tr key={rate.id}>
              <td>{rate.effective_date}</td>
              <td>{pct(rate.annual_rate)}</td>
              <td>
                {rate.prime_rate == null
                  ? rate.rate_kind
                  : `${pct(rate.prime_rate)} + ${pct(rate.spread)}`}
              </td>
              <td>{rate.note || rate.source.replaceAll("_", " ")}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onDelete(rate.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!rates.length && (
            <tr>
              <td className="data-table__empty" colSpan="5">
                No rate history for this debt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChargeHistory({ charges, loading, onDelete }) {
  return (
    <div className="table-wrap interest-history-table">
      <table className="data-table">
        <thead>
          <tr>
            <th className="data-table__head">Date</th>
            <th className="data-table__head">Type</th>
            <th className="data-table__head">Amount</th>
            <th className="data-table__head">Note</th>
            <th className="data-table__head">Actions</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => (
            <tr key={charge.id}>
              <td>{charge.charged_on}</td>
              <td>{charge.charge_type}</td>
              <td>{money(charge.amount)}</td>
              <td>{charge.note || "—"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onDelete(charge.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!charges.length && (
            <tr>
              <td className="data-table__empty" colSpan="5">
                No posted charges for this debt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
