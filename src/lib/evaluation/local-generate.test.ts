import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { generateLocalEvaluation } from "./local-generate.ts";
import type { DailyReport, EvaluationCriterion } from "@/types/database";

/**
 * The local evaluator stands in for the Claude API while there is no key. It
 * is only useful if it actually reflects what was written -- an evaluator that
 * gives everyone 5/5 is worse than no evaluator, because it looks like the
 * product rubber-stamps people.
 */

const criteria: EvaluationCriterion[] = [
  { key: "safety", label: "安全管理" },
  { key: "growth", label: "成長・自己研鑽" },
].map((c, i) => ({
  id: `c${i}`,
  key: c.key,
  label: c.label,
  description: null,
  category: null,
  weight: 1,
  sort_order: i,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
}));

function daily(date: string, content: string): DailyReport {
  return {
    id: date,
    user_id: "u",
    report_date: date,
    work_content: content,
    work_hours: 8,
    issues: null,
    tomorrow_plan: null,
    created_at: `${date}T00:00:00.000Z`,
    updated_at: `${date}T00:00:00.000Z`,
  };
}

const run = (reports: DailyReport[]) =>
  generateLocalEvaluation({
    employeeName: "山田 太郎",
    dailyReports: reports,
    weeklyReport: null,
    criteria,
  });

const scoreOf = (result: ReturnType<typeof run>, key: string) =>
  result.criteriaScores.find((s) => s.key === key)!.score;

describe("ローカル週次評価", () => {
  test("記述された項目とされなかった項目で点が分かれる", () => {
    const result = run([
      daily("2026-08-03", "安全パトロールを実施。KY活動で危険箇所を共有し、養生を是正した。"),
      daily("2026-08-04", "ヒヤリハットを1件記録。保護具の着用を確認した。"),
    ]);

    assert.ok(scoreOf(result, "safety") >= 4, "根拠がある項目が高く出ていない");
    assert.equal(scoreOf(result, "growth"), 2, "記述のない項目に点がついている");
  });

  test("全項目が満点にはならない（判子評価にならないこと）", () => {
    const result = run([
      daily("2026-08-03", "安全確認、図面照合、工程調整、資材発注、打ち合わせ、改善提案、資格の勉強。"),
    ]);
    const scores = result.criteriaScores.map((s) => s.score);
    assert.ok(
      new Set(scores).size > 1 || scores.every((s) => s < 5),
      "全項目が同じ満点になっている"
    );
  });

  test("同じ入力なら常に同じ結果（決定論的）", () => {
    const reports = [daily("2026-08-03", "安全パトロールと図面の照合を実施。")];
    assert.deepEqual(run(reports).criteriaScores, run(reports).criteriaScores);
  });

  test("日報が1件も無い週は判断材料なしとして扱う", () => {
    const result = run([]);
    assert.ok(result.criteriaScores.every((s) => s.score <= 2));
    assert.match(result.overallSummary, /0\/5件/);
  });

  test("総評にAI未接続であることが必ず入る", () => {
    const result = run([daily("2026-08-03", "安全確認を実施。")]);
    assert.match(result.overallSummary, /AI未接続/);
  });

  test("コメントは点の根拠になった語を挙げる", () => {
    const result = run([daily("2026-08-03", "安全パトロールとKY活動を実施。")]);
    const safety = result.criteriaScores.find((s) => s.key === "safety")!;
    assert.match(safety.comment, /安全/);
    const growth = result.criteriaScores.find((s) => s.key === "growth")!;
    assert.match(growth.comment, /見当たりませんでした/);
  });
});
