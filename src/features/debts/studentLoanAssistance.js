function dateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${dateString(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function assistanceIsActive(period, onDate) {
  const date = dateString(onDate);
  return (
    Boolean(date) &&
    period.starts_on <= date &&
    (!period.ends_on || period.ends_on >= date)
  );
}

export function requiredPaymentForDate(
  debt,
  onDate,
  regularPayment = Number(debt?.minimum_payment ?? 0),
) {
  const normalPayment = Number(regularPayment);
  const active = (debt?.debt_assistance_periods ?? []).filter((period) =>
    assistanceIsActive(period, onDate),
  );
  if (active.some((period) => period.assistance_type === "payment_pause")) {
    return 0;
  }
  const reduced = active
    .filter((period) => period.assistance_type === "reduced_payment")
    .map((period) => Number(period.required_payment))
    .filter(Number.isFinite);
  return reduced.length ? Math.min(normalPayment, ...reduced) : normalPayment;
}

export function isInterestFreeOnDate(periods, onDate) {
  return (periods ?? []).some(
    (period) =>
      period.assistance_type === "interest_free" &&
      assistanceIsActive(period, onDate),
  );
}

export function applyInterestFreePeriods(
  normalizedRates,
  assistancePeriods,
  loanStartDate,
) {
  const baseRates = [...(normalizedRates ?? [])].sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
  if (!baseRates.length) return [];

  const interestFree = (assistancePeriods ?? []).filter(
    (period) => period.assistance_type === "interest_free",
  );
  if (!interestFree.length) return baseRates;

  const start = dateString(loanStartDate);
  const boundaries = new Set(
    baseRates.map((rate) => dateString(rate.date)).filter((date) => date >= start),
  );
  boundaries.add(start);
  for (const period of interestFree) {
    if (period.starts_on >= start) boundaries.add(period.starts_on);
    if (period.ends_on) {
      const resumesOn = addDays(period.ends_on, 1);
      if (resumesOn >= start) boundaries.add(resumesOn);
    }
  }

  const effective = [];
  for (const boundary of [...boundaries].sort()) {
    const baseRate = [...baseRates]
      .reverse()
      .find((rate) => dateString(rate.date) <= boundary);
    const annualRate = isInterestFreeOnDate(interestFree, boundary)
      ? 0
      : Number(baseRate?.annualRate ?? baseRates[0].annualRate);
    if (effective.at(-1)?.annualRate === annualRate) continue;
    effective.push({
      date: new Date(`${boundary}T00:00:00Z`),
      annualRate,
    });
  }
  return effective;
}

export function rateForDate(normalizedRates, onDate) {
  const date = dateString(onDate);
  return (
    [...(normalizedRates ?? [])]
      .reverse()
      .find((rate) => dateString(rate.date) <= date)?.annualRate ?? 0
  );
}
