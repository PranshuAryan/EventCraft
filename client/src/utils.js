const MS_PER_DAY = 86_400_000;

/** True for null and undefined (but not for 0, "" or false). */
export const isNil = (value) => value === null || value === undefined;

/**
 * Formats a "YYYY-MM-DD" string as a short Indian-locale date, e.g. "5 Dec 2026".
 * Returns an empty string when no date is given.
 */
export function formatDate(isoDate) {
  if (!isoDate) return "";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole days from today until the given "YYYY-MM-DD" date. Never negative. */
export function daysUntil(isoDate) {
  const target = new Date(`${isoDate}T00:00:00`);
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  return Math.max(Math.round((target - startOfToday) / MS_PER_DAY), 0);
}
