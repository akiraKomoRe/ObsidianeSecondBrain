import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { isLocalAiMode } from "@/lib/local/mode";
import { countWorkingDays } from "@/lib/attendance/working-days";
import {
  RECORD_EVALUATION_TOOL,
  WEEKLY_PROMPT_VERSION,
  buildEvaluationPrompt,
  maxTokensFor,
} from "./prompt";
import { LOCAL_MODEL_VERSION, LOCAL_PROMPT_VERSION, generateLocalEvaluation } from "./local-generate";
import type { CriterionScore } from "@/types/database";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * 注意: `temperature` は設定していない。設定できない。
 * claude-sonnet-5 / claude-opus-5 など現行モデルでは temperature・top_p・top_k は
 * 廃止されており、送ると 400 で落ちる。「同じ日報なら毎回同じ点数」を温度で
 * 担保することはできないので、再現性は別の方法で確保している ——
 * 生成結果そのものを `weekly_ai_evaluations` に保存し、以後の画面はその保存値を
 * 読む。再生成しない限り評点は動かない（規程 第12条の不服申立てで参照されるのは
 * この保存された行であって、モデルの再実行結果ではない）。
 *
 * 深さとコストの調整は effort で行う。medium は日報1週間分の採点には十分で、
 * high 以上にすると思考トークンが増えるだけで評点はほぼ変わらなかった。
 */
const EFFORT = "medium" as const;

/** 一時的な 429 / 5xx で週報提出そのものを失敗させないための再試行回数。 */
const MAX_RETRIES = 3;
/** ミリ秒。TypeScript SDK の timeout はミリ秒指定であることに注意。 */
const TIMEOUT_MS = 120_000;

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

  // 休日・有給を除いた実際の稼働日数。5日固定ではないので、有給を取った週に
  // 「日報が足りない」と評価されることがない。
  const expectedDays = await countWorkingDays(userId, weekStart, weekEnd);

  // Without an API key, score the same reports locally instead of failing the
  // whole weekly-report submission. The rows are stamped with a distinct
  // model_version so the screens can label them rather than pass them off as
  // AI output -- see local-generate.ts.
  if (isLocalAiMode()) {
    const local = generateLocalEvaluation({
      employeeName: profile.name,
      dailyReports: dailyList,
      weeklyReport: weeklyReport ?? null,
      criteria: criteriaList,
      expectedDays,
    });
    return persist({
      userId,
      weekStart,
      weekEnd,
      criteriaScores: local.criteriaScores,
      overallSummary: local.overallSummary,
      modelVersion: LOCAL_MODEL_VERSION,
      promptVersion: LOCAL_PROMPT_VERSION,
    });
  }

  const prompt = buildEvaluationPrompt({
    employeeName: profile.name,
    weekStart,
    weekEnd,
    dailyReports: dailyList,
    weeklyReport: weeklyReport ?? null,
    criteria: criteriaList,
    expectedDays,
  });

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
  });

  let toolInput: { criteria_scores: { key: string; score: number; comment: string }[]; overall_summary: string };
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokensFor(criteriaList.length),
      output_config: { effort: EFFORT },
      tools: [RECORD_EVALUATION_TOOL],
      tool_choice: { type: "tool", name: RECORD_EVALUATION_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    });

    // 途中で切れた応答を「評価が終わった」として保存しない。max_tokens で
    // 打ち切られたツール呼び出しは項目が欠けたまま構文的には成立してしまう。
    if (message.stop_reason === "max_tokens") {
      return { status: "error", message: "AI response was truncated (max_tokens)" };
    }
    if (message.stop_reason === "refusal") {
      return { status: "error", message: "AI declined to evaluate this report" };
    }

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { status: "error", message: "AI did not return a structured evaluation" };
    }
    toolInput = toolUse.input as typeof toolInput;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Anthropic API call failed" };
  }

  const criteriaByKey = new Map(criteriaList.map((c) => [c.key, c]));
  const seen = new Set<string>();
  const criteriaScores: CriterionScore[] = [];

  for (const scored of toolInput.criteria_scores ?? []) {
    const criterion = criteriaByKey.get(scored.key);
    // 知らないkeyは捨てる。存在しない評価項目を勝手に作らせない。
    if (!criterion || seen.has(scored.key)) continue;
    if (typeof scored.score !== "number" || !Number.isFinite(scored.score)) continue;
    seen.add(scored.key);
    criteriaScores.push({
      key: scored.key,
      label: criterion.label,
      score: Math.min(5, Math.max(1, Math.round(scored.score))),
      comment: scored.comment ?? "",
    });
  }

  // 項目の取りこぼしは黙って捨てない。5項目のはずが3項目で保存されると、
  // 画面上の平均点は成立してしまうのに分母が違うという最悪の壊れ方をする。
  // 部分的に保存するくらいなら、失敗として上長に見せるほうがまだ正しい。
  const missing = criteriaList.filter((c) => !seen.has(c.key)).map((c) => c.key);
  if (missing.length > 0) {
    return {
      status: "error",
      message: `AI omitted evaluation criteria: ${missing.join(", ")}`,
    };
  }

  return persist({
    userId,
    weekStart,
    weekEnd,
    criteriaScores,
    overallSummary: toolInput.overall_summary,
    modelVersion: MODEL,
    promptVersion: WEEKLY_PROMPT_VERSION,
  });
}

/** Shared by both paths so the row looks identical whichever produced it. */
async function persist({
  userId,
  weekStart,
  weekEnd,
  criteriaScores,
  overallSummary,
  modelVersion,
  promptVersion,
}: {
  userId: string;
  weekStart: string;
  weekEnd: string;
  criteriaScores: CriterionScore[];
  overallSummary: string;
  modelVersion: string;
  promptVersion: string;
}): Promise<GenerateEvaluationResult> {
  const { error } = await createAdminClient()
    .from("weekly_ai_evaluations")
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        criteria_scores: criteriaScores,
        overall_summary: overallSummary,
        model_version: modelVersion,
        // 何を根拠に出た評点かを後から特定できるように、モデルと対で
        // プロンプトの版も残す（規程 第12条の不服申立て用）。
        prompt_version: promptVersion,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    );

  return error ? { status: "error", message: error.message } : { status: "generated" };
}
