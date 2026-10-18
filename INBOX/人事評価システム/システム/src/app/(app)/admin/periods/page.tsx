import { createClient } from "@/lib/supabase/server";
import { formatPeriodLabel } from "@/lib/evaluation/get-term";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PeriodForm, PeriodStatusButton } from "./period-form";

export default async function AdminPeriodsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_periods")
    .select("*")
    .order("year", { ascending: false })
    .order("half", { ascending: false });
  const periods = data ?? [];

  return (
    <div className="space-y-4">
      <PeriodForm defaultYear={new Date().getFullYear()} />

      <div className="space-y-3">
        {periods.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-app-text-muted">
              評価期間がまだ登録されていません。上のフォームから登録してください。
            </p>
          </Card>
        ) : null}

        {periods.map((period) => (
          <Card key={period.id} className="gap-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-app-text">{formatPeriodLabel(period)}</p>
                <Badge variant={period.status === "open" ? "accent" : "outline"}>
                  {period.status === "open" ? "受付中" : "締切済み"}
                </Badge>
              </div>
              <PeriodStatusButton
                id={period.id}
                next={period.status === "open" ? "closed" : "open"}
              />
            </div>
            <p className="tabular text-xs text-app-text-faint">
              {period.starts_on} 〜 {period.ends_on}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-md font-semibold text-app-text">期の区切りについて</h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
          上期は1〜6月、下期は7〜12月で固定しています。賃金規定 第29条の賞与支給月（7月・12月）と
          締めを揃えるためで、日付を個別に編集できないのは意図的です。
        </p>
      </Card>
    </div>
  );
}
