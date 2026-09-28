export function effectiveAnnualRate({ rateType, annualRatePct, primeRatePct, spreadPct }) {
  if (rateType === "interest_free") return 0;
  if (rateType === "variable") {
    return percentToDecimal(primeRatePct) + percentToDecimal(spreadPct);
  }
  return percentToDecimal(annualRatePct);
}

export function percentToDecimal(value) {
  if (value === "" || value === null || value === undefined) return Number.NaN;
  const percent = Number(value);
  return Number.isFinite(percent) ? percent / 100 : Number.NaN;
}

export function decimalToPercent(value) {
  const decimal = Number(value);
  return Number.isFinite(decimal) ? String(decimal * 100) : "";
}

export function validateDebtRate(values) {
  if (!values.debtId) throw new Error("Choose a debt.");
  if (!values.effectiveDate) throw new Error("Effective date is required.");
  const annualRate = effectiveAnnualRate(values);
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new Error("Enter a valid interest rate.");
  }
  if (values.isPromotional) {
    const followOnRate = percentToDecimal(values.postPromoAnnualRatePct);
    if (!values.promoEndsOn || values.promoEndsOn < values.effectiveDate) {
      throw new Error("Promotion expiry must be on or after the effective date.");
    }
    if (!Number.isFinite(followOnRate) || followOnRate < 0) {
      throw new Error("Enter the APR that applies after the promotion.");
    }
  }
  return annualRate;
}
