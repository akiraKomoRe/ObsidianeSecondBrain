"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type DailyReportState = { error: string | null; success: boolean };

export async function saveDailyReport(
  _prevState: DailyReportState,
  formData: FormData
): Promise<DailyReportState> {
  const reportDate = String(formData.get("report_date") ?? "");
  const workContent = String(formData.get("work_content") ?? "").trim();
  const workHoursRaw = String(formData.get("work_hours") ?? "");
  const issues = String(formData.get("issues") ?? "").trim();
  const tomorrowPlan = String(formData.get("tomorrow_plan") ?? "").trim();

  if (!reportDate || !workContent) {
    return { error: "日付と作業内容は必須です。", success: false };
  }

  const workHours = workHoursRaw ? Number(workHoursRaw) : null;
  if (workHours !== null && (Number.isNaN(workHours) || workHours < 0 || workHours > 24)) {
    return { error: "工数は0〜24の数値で入力してください。", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です。", success: false };
  }

  const { error } = await supabase.from("daily_reports").upsert(
    {
      user_id: user.id,
      report_date: reportDate,
      work_content: workContent,
      work_hours: workHours,
      issues,
      tomorrow_plan: tomorrowPlan,
    },
    { onConflict: "user_id,report_date" }
  );

  if (error) {
    return { error: "保存に失敗しました。時間をおいて再度お試しください。", success: false };
  }

  revalidatePath("/daily");
  revalidatePath("/weekly");
  return { error: null, success: true };
}
