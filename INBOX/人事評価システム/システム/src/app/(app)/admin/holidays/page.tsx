import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { HolidayForm, HolidayDeleteButton } from "./holiday-form";

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

export default async function AdminHolidaysPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_holidays")
    .select("*")
    .order("holiday_on", { ascending: true });
  const holidays = data ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.holiday_on >= today);
  const past = holidays.filter((h) => h.holiday_on < today);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-md font-semibold text-app-text">設定が効くところ</h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
          登録した日は全社員の稼働日から外れます。ホームの「今週の日報 n/m件」の分母に入らなくなり、
          日報画面には「本日は◯◯です。提出は不要です」と表示され、AI週次評価も
          その日に日報が無いことを未提出として扱いません。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
          個人の有給・欠勤はここではなく `personal_leaves` で管理します（ジョブカン勤怠と
          連携すると、そちらは自動で同期されます）。土日は登録不要です。
        </p>
      </Card>

      <HolidayForm />

      <Card className="gap-0 py-0">
        <div className="border-b border-app-border px-5 py-3.5">
          <h2 className="text-md font-semibold text-app-text">これからの休日</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-5 py-6 text-sm text-app-text-muted">
            登録された休日がありません。祝日・年末年始・創立記念日などを登録してください。
          </p>
        ) : (
          <ul className="divide-y divide-app-border-soft">
            {upcoming.map((holiday) => (
              <li
                key={holiday.holiday_on}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="tabular text-sm font-medium text-app-text">
                    {holiday.holiday_on}（
                    {WEEKDAY[new Date(`${holiday.holiday_on}T00:00:00`).getDay()]}）
                  </p>
                  {holiday.label ? (
                    <p className="text-xs text-app-text-muted">{holiday.label}</p>
                  ) : null}
                </div>
                <HolidayDeleteButton holidayOn={holiday.holiday_on} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 ? (
        <Card className="gap-0 py-0">
          <div className="border-b border-app-border px-5 py-3.5">
            <h2 className="text-md font-semibold text-app-text">過去の休日</h2>
            <p className="mt-0.5 text-xs text-app-text-muted">
              過去の評価の分母に効いているので、消すと当時の提出率が変わります。
            </p>
          </div>
          <ul className="divide-y divide-app-border-soft">
            {past.slice(-20).map((holiday) => (
              <li key={holiday.holiday_on} className="px-5 py-2.5">
                <p className="tabular text-sm text-app-text-muted">
                  {holiday.holiday_on}
                  {holiday.label ? ` ・ ${holiday.label}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
