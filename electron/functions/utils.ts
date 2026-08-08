/**
 * Combines a calendar date with a time to produce a SQLite-friendly datetime string.
 * @param date - ISO date string (YYYY-MM-DD) or ISO datetime string.
 * @param time - Optional time string (HH:mm:ss). Defaults to the current wall-clock time.
 * @returns Combined timestamp in the format `YYYY-MM-DD HH:mm:ss`.
 */
export function buildTransactionTimestamp(date: string, time?: string): string {
  const datePart = date.split('T')[0];
  const timePart = time ?? new Date().toTimeString().slice(0, 8);
  return `${datePart} ${timePart}`;
}
