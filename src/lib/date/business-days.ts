import { formatDate, parseDate } from "./week";

// Counts Mon-Fri dates between weekStart and end (inclusive), used as the
// "expected number of daily reports so far this week" denominator on the
// dashboard. end is typically today, clamped to the week's Sunday.
export function countWeekdays(weekStartValue: string, endValue: string): number {
  const start = parseDate(weekStartValue);
  const end = parseDate(endValue);
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function clampToToday(weekEndValue: string, today: Date): string {
  const weekEnd = parseDate(weekEndValue);
  return weekEnd < today ? weekEndValue : formatDate(today);
}
