import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildEvaluationPrompt } from "./prompt";
import type { CriterionScore } from "@/types/database";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const RECORD_EVALUATION_TOOL = {
  name: "record_weekly_evaluation",
  description: "その週の評価項目ごとのスコア・コメントと総評を記録する",
  input_schema: {
    type: "object" as const,
    properties: {
      criteria_scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", description: "評価項目のkey" },
            score: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string", description: "この項目についての具体的なコメント（日本語）" },
          },
          required: ["key", "score", "comment"],
        },
      },
      overall_summary: { type: "string", description: "週全体の総評（日本語、2〜4文程度）" },
    },
    required: ["criteria_scores", "overall_summary"],
  },
};

export type GenerateEvaluationResult =
  | { status: "generated" }
  | { status: "skipped_no_reports" }
  | { status: "error"; message: string };

export async function generateWeeklyEvaluation({
  userId,
  weekStart,
  weekEnd,
}: {
  userId: string;
  weekStart: string;
  weekEnd: string;
}): Promise<GenerateEvaluationResult> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: dailyReports }, { data: weeklyReport }, { data: criteria }] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", userId).single(),
      admin
        .from("daily_reports")
        .select("*")
        .eq("user_id", userId)
        .gte("report_date", weekStart)
        .lte("report_date", weekEnd)
        .order("report_date", { ascending: true }),
      admin
        .from("weekly_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle(),
      admin
        .from("evaluation_criteria")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (!profile) {
    return { status: "error", message: "profile not found" };
  }

  const dailyList = dailyReports ?? [];
  const criteriaList = criteria ?? [];

  if (dailyList.length === 0 && !weeklyReport?.self_reflection) {
    return { status: "skipped_no_reports" };
  }

  if (criteriaList.length === 0) {
    return { status: "error", message: "no active evaluation criteria configured" };
  }

  const prompt = buildEvaluationPrompt({
    employeeName: profile.name,
    weekStart,
    weekEnd,
    dailyReports: dailyList,
    weeklyReport: weeklyReport ?? null,
    criteria: criteriaList,
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let toolInput: { criteria_scores: { key: string; score: number; comment: string }[]; overall_summary: string };
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      tools: [RECORD_EVALUATION_TOOL],
      tool_choice: { type: "tool", name: RECORD_EVALUATION_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { status: "error", message: "AI did not return a structured evaluation" };
    }
    toolInput = toolUse.input as typeof toolInput;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Anthropic API call failed" };
  }

  const criteriaByKey = new Map(criteriaList.map((c) => [c.key, c]));
  const criteriaScores: CriterionScore[] = toolInput.criteria_scores
    .filter((s) => criteriaByKey.has(s.key))
    .map((s) => ({
      key: s.key,
      label: criteriaByKey.get(s.key)!.label,
      score: Math.min(5, Math.max(1, Math.round(s.score))),
      comment: s.comment,
    }));

  const { error: upsertError } = await admin.from("weekly_ai_evaluations").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      criteria_scores: criteriaScores,
      overall_summary: toolInput.overall_summary,
      model_version: MODEL,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" }
  );

  if (upsertError) {
    return { status: "error", message: upsertError.message };
  }

  return { status: "generated" };
}
