"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { generateWeeklyEvaluation } from "@/lib/evaluation/generate";

export type WeeklyReportState = { error: string | null; success: boolean };

export async function submitWeeklyReport(
  _prevState: WeeklyReportState,
  formData: FormData
): Promise<WeeklyReportState> {
  const weekStart = String(formData.get("week_start") ?? "");
  const weekEnd = String(formData.get("week_end") ?? "");
  const selfReflection = String(formData.get("self_reflection") ?? "").trim();

  if (!weekStart || !weekEnd) {
    return { error: "対象週が不正です。", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です。", success: false };
  }

  const { error } = await supabase.from("weekly_reports").upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      week_end: weekEnd,
      self_reflection: selfReflection,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" }
  );

  if (error) {
    return { error: "保存に失敗しました。時間をおいて再度お試しください。", success: false };
  }

  // Kick off the AI weekly evaluation right away so the employee doesn't
  // have to wait for the batch job. Best-effort: a failure here doesn't
  // block the weekly report submission itself (the Sunday-night batch job
  // will retry anyone who's missing an evaluation).
  const result = await generateWeeklyEvaluation({ userId: user.id, weekStart, weekEnd });

  revalidatePath("/weekly");
  revalidatePath("/evaluations");

  if (result.status === "error") {
    return {
      error: `週報は保存しましたが、AI評価の生成に失敗しました（${result.message}）。時間をおいて自動的に再評価されます。`,
      success: true,
    };
  }

  return { error: null, success: true };
}
