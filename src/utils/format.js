export function money(n) {
  if (!isFinite(n)) return "";
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "CAD",
  });
}

export function pct(n) {
  if (!isFinite(n)) return "";
  return `${(Number(n) * 100).toFixed(3)}%`;
}

export function todayUtcDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
