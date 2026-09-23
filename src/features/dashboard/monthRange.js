function formatUtcDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthBounds(monthString) {
  if (!monthString) return { start: null, end: null };
  const [year, month] = monthString.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    return { start: null, end: null };
  }
  return {
    start: formatUtcDate(new Date(Date.UTC(year, month - 1, 1))),
    end: formatUtcDate(new Date(Date.UTC(year, month, 1))),
  };
}
