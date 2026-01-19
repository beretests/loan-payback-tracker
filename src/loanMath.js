function toDateOnly(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysUTC(d, days) {
  const nd = new Date(d.getTime());
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

function fmtDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function addMonthsUTC(d, months) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const nd = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(
    Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() + 1, 0)
  ).getUTCDate();
  nd.setUTCDate(Math.min(day, lastDay));
  return nd;
}

export function calcMonthlyPayment(P, annualRate, nMonths) {
  const r = annualRate / 12;
  if (r === 0) return P / nMonths;
  return (P * r) / (1 - Math.pow(1 + r, -nMonths));
}

// Normalize {effective_date, annual_rate} to [{date: Date, annualRate: number}] sorted, clamped to start
export function normalizeRatePeriods(rateRows, loanStartDate) {
  const start = toDateOnly(loanStartDate);
  const cleaned = (rateRows || [])
    .filter((r) => r?.effective_date && isFinite(Number(r?.annual_rate)))
    .map((r) => ({
      date: toDateOnly(r.effective_date),
      annualRate: Number(r.annual_rate),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (cleaned.length === 0) return [{ date: start, annualRate: 0 }];

  if (cleaned[0].date.getTime() > start.getTime()) {
    cleaned.unshift({ date: start, annualRate: cleaned[0].annualRate });
  }
  return cleaned;
}

function accrueInterestVariableRate(
  balance,
  fromDate,
  toDate,
  ratePeriods,
  dayCountBasis
) {
  if (balance <= 0) return 0;
  if (toDate.getTime() <= fromDate.getTime()) return 0;

  let i = 0;
  while (
    i + 1 < ratePeriods.length &&
    ratePeriods[i + 1].date.getTime() <= fromDate.getTime()
  )
    i++;

  let cursor = fromDate;
  let interest = 0;

  while (cursor.getTime() < toDate.getTime()) {
    const rate = ratePeriods[i].annualRate;
    const nextBoundary =
      i + 1 < ratePeriods.length ? ratePeriods[i + 1].date : null;
    const segmentEnd =
      nextBoundary && nextBoundary.getTime() < toDate.getTime()
        ? nextBoundary
        : toDate;

    const days = daysBetween(cursor, segmentEnd);
    if (days > 0) interest += balance * (rate / dayCountBasis) * days;

    cursor = segmentEnd;
    if (nextBoundary && cursor.getTime() === nextBoundary.getTime())
      i = Math.min(i + 1, ratePeriods.length - 1);
    else break;
  }

  return interest;
}

// Events from payment_events: {paid_date, amount, kind}
export function buildActualEventsFromPaymentEvents(paymentEvents) {
  return (paymentEvents || [])
    .filter((e) => e?.paid_date && Number(e?.amount) > 0)
    .map((e) => ({
      type: e.kind === "extra" ? "extra" : "monthly", // treat non-extra as monthly-like payment event
      date: toDateOnly(e.paid_date),
      amount: Number(e.amount),
      note: e.note ?? null,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Build amortization schedule using ACTUAL events only (no auto monthly events).
// This is useful for “what actually happened” accounting.
export function buildScheduleFromActualEvents({
  principal,
  startDate,
  ratePeriods,
  dayCountBasis,
  events, // from payment_events
  extraAppliesToPrincipalOnly = true,
}) {
  const start = toDateOnly(startDate);

  let bal = Number(principal);
  let lastDate = start;

  let totalPaid = 0;
  let totalInterest = 0;

  const rows = [];

  for (const ev of events) {
    if (bal <= 0) break;

    const interestAccrued = accrueInterestVariableRate(
      bal,
      lastDate,
      ev.date,
      ratePeriods,
      dayCountBasis
    );
    totalInterest += interestAccrued;

    let payment = ev.amount;

    // Cap overpayment
    const maxNeeded = interestAccrued + bal;
    if (payment > maxNeeded) payment = maxNeeded;

    let toInterest = 0;
    let toPrincipal = 0;

    if (ev.type === "extra" && extraAppliesToPrincipalOnly) {
      toInterest = 0;
      toPrincipal = payment;
    } else {
      toInterest = Math.min(payment, interestAccrued);
      toPrincipal = Math.max(0, payment - toInterest);
    }

    bal = Math.max(0, bal - toPrincipal);
    totalPaid += payment;

    rows.push({
      date: fmtDate(ev.date),
      type: ev.type,
      payment,
      interestAccrued,
      toInterest,
      toPrincipal,
      balance: bal,
      note: ev.note,
    });

    lastDate = ev.date;
  }

  return { rows, endingBalance: bal, totalPaid, totalInterest };
}

/**
 * Status for scheduled payments based on actual events:
 * - For each scheduled due date i, define window [due_i, due_{i+1}) and sum payment_events in that window.
 * - paid if sum >= expected
 * - partial if 0 < sum < expected
 * - missed if sum == 0 and due_i < today
 * - upcoming otherwise
 */
/**
 * Status for scheduled payments based on actual events, with grace.
 * Window for due_i is:
 *   [due_i, min(due_{i+1}, due_i + graceDays))  (end exclusive)
 */
export function computeScheduledStatuses({
  scheduledPayments,
  paymentEvents,
  todayDateUtc,
  graceDays = 15,
}) {
  const today = toDateOnly(todayDateUtc);

  const sched = [...(scheduledPayments || [])].sort((a, b) =>
    String(a.due_date).localeCompare(String(b.due_date))
  );
  const events = [...(paymentEvents || [])].sort((a, b) =>
    String(a.paid_date).localeCompare(String(b.paid_date))
  );

  const parsedEvents = events.map((e) => ({
    ...e,
    _date: toDateOnly(e.paid_date),
    _amt: Number(e.amount),
  }));

  const results = [];

  for (let i = 0; i < sched.length; i++) {
    const cur = sched[i];
    const next = sched[i + 1];

    const windowStart = toDateOnly(cur.due_date);

    const graceEnd = addDaysUTC(windowStart, Number(graceDays)); // due + 15 days
    const nextDue = next ? toDateOnly(next.due_date) : null;

    // Window end is the earlier of next due date and grace end (or grace end if no next)
    const windowEnd = nextDue
      ? nextDue.getTime() < graceEnd.getTime()
        ? nextDue
        : graceEnd
      : graceEnd;

    let sum = 0;
    for (const ev of parsedEvents) {
      const t = ev._date.getTime();
      if (t < windowStart.getTime()) continue;
      if (t >= windowEnd.getTime()) continue; // end-exclusive
      sum += ev._amt;
    }

    const expected = Number(cur.expected_amount);

    let status = "upcoming";
    if (sum >= expected && expected > 0) status = "paid";
    else if (sum > 0 && sum < expected) status = "partial";
    else if (sum === 0 && windowEnd.getTime() <= today.getTime())
      status = "missed";
    // Note the missed rule: only mark missed AFTER the grace window has passed.

    results.push({
      ...cur,
      window_from: cur.due_date,
      window_to: `${windowEnd.getUTCFullYear()}-${String(
        windowEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(windowEnd.getUTCDate()).padStart(2, "0")}`,
      paid_in_window: sum,
      status,
    });
  }

  return results;
}

export function buildForecastScheduleFixedPayment({
  principal,
  startDate,
  amortMonths,
  monthlyPayment,
  dayCountBasis,
  ratePeriods, // normalized [{date, annualRate}]
  extraPayments, // [{paid_date, amount}] or [{date, amount}]
}) {
  const start = toDateOnly(startDate);

  // Monthly scheduled events
  const monthlyEvents = [];
  for (let i = 1; i <= amortMonths; i++) {
    monthlyEvents.push({
      type: "monthly",
      date: addMonthsUTC(start, i),
      amount: Number(monthlyPayment),
    });
  }

  // Extra events (accept either paid_date or date)
  const extraEvents = (extraPayments || [])
    .filter((p) => (p?.paid_date || p?.date) && Number(p?.amount) > 0)
    .map((p) => ({
      type: "extra",
      date: toDateOnly(p.paid_date ?? p.date),
      amount: Number(p.amount),
    }));

  // Sort: by date; on same day apply extra before monthly
  const events = [...monthlyEvents, ...extraEvents].sort((a, b) => {
    const t = a.date.getTime() - b.date.getTime();
    if (t !== 0) return t;
    if (a.type === b.type) return 0;
    return a.type === "extra" ? -1 : 1;
  });

  let bal = Number(principal);
  let lastDate = start;

  let totalPaid = 0;
  let totalInterest = 0;
  const rows = [];

  for (const ev of events) {
    if (bal <= 0) break;

    const interestAccrued = accrueInterestVariableRate(
      bal,
      lastDate,
      ev.date,
      ratePeriods,
      dayCountBasis
    );
    totalInterest += interestAccrued;

    let payment = ev.amount;

    // Cap payment to avoid negative balance:
    // monthly: cap to interest + principal
    // extra: cap to principal (principal-only)
    if (ev.type === "monthly") {
      const maxNeeded = interestAccrued + bal;
      if (payment > maxNeeded) payment = maxNeeded;
    } else {
      if (payment > bal) payment = bal;
    }

    let toInterest = 0;
    let toPrincipal = 0;

    if (ev.type === "extra") {
      // principal-only
      toInterest = 0;
      toPrincipal = payment;
    } else {
      toInterest = Math.min(payment, interestAccrued);
      toPrincipal = Math.max(0, payment - toInterest);
    }

    bal = Math.max(0, bal - toPrincipal);
    totalPaid += payment;

    rows.push({
      date: fmtDate(ev.date),
      type: ev.type,
      payment,
      interestAccrued,
      toInterest,
      toPrincipal,
      balance: bal,
    });

    lastDate = ev.date;
  }

  const payoffDate = rows.length ? rows[rows.length - 1].date : null;

  return { rows, totalPaid, totalInterest, endingBalance: bal, payoffDate };
}
