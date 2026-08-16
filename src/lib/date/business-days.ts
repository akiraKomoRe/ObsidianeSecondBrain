import { formatDate, parseDate } from "./week";

// Counting which days a report is owed for now lives in
// `src/lib/attendance/working-days.ts`, because the answer depends on company
// holidays and the person's own leave -- not just on Mon-Fri. What is left
// here is the piece of that question which is purely about dates.

/**
 * Caps the week's end at today, so a Wednesday shows "n / 3" rather than
 * "n / 5" and the two days that have not happened yet are not counted as
 * missing.
 */
export function clampToToday(weekEndValue: string, today: Date): string {
  const weekEnd = parseDate(weekEndValue);
  return weekEnd < today ? weekEndValue : formatDate(today);
}
