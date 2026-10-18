// Week = Monday..Sunday, matching Japanese business convention.

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekStart(date: Date): Date {
  const d = toDateOnly(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = toDateOnly(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

export function getWeekRange(date: Date): { weekStart: string; weekEnd: string } {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(weekStart);
  return { weekStart: formatDate(weekStart), weekEnd: formatDate(weekEnd) };
}

export function addWeeks(weekStartValue: string, delta: number): string {
  const d = parseDate(weekStartValue);
  d.setDate(d.getDate() + delta * 7);
  return formatDate(d);
}

export function formatWeekLabel(weekStartValue: string, weekEndValue: string): string {
  const start = parseDate(weekStartValue);
  const end = parseDate(weekEndValue);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} 〜 ${fmt(end)}`;
}
