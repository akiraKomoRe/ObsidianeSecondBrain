import type { DailyReport, EvaluationCriterion, WeeklyReport } from "@/types/database";

/**
 * Everything that shapes what the AI is asked lives in this file: the prompt
 * text, the tool schema it must answer through, and the version stamp.
 *
 * ## 変更するときのルール
 *
 * 本文・ツール定義・注意書きのいずれかを変えたら、必ず `WEEKLY_PROMPT_VERSION`
 * を上げること。人事評価規程 第12条で本人は評価に不服を申し立てられる。その場で
 * 「この評点は何を根拠に出たのか」を再現できなければ審査ができないので、
 * 生成された行には `model_version` と `prompt_version` の両方を刻む。
 * バージョンさえ残っていれば、本文そのものは git 履歴から復元できる。
 *
 * 逆に言うと、本文をデータベースに置くことはしない。プロンプトはコードと同じ
 * 速度で変わるものなので、差分レビューが効く場所に置くのが正しい。
 */
export const WEEKLY_PROMPT_VERSION = "weekly-v1";

/**
 * The structured answer we require. Forced via `tool_choice` so the model
 * cannot reply in prose -- these numbers feed 賞与 calculations, so a free-text
 * answer we have to parse is not acceptable.
 */
export const RECORD_EVALUATION_TOOL = {
  name: "record_weekly_evaluation",
  description: "その週の評価項目ごとのスコア・コメントと総評を記録する",
  input_schema: {
    type: "object" as const,
    properties: {
      criteria_scores: {
        type: "array",
        description: "指定された評価項目すべてに対して、1件ずつ必ず出力すること。項目を省略してはならない。",
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

/**
 * Output ceiling for one evaluation. Scales with the number of criteria
 * because every criterion costs a score plus a Japanese comment; a fixed 2000
 * silently truncated the tool call once the criteria list grew, which surfaces
 * as a missing項目 rather than an error.
 */
export function maxTokensFor(criteriaCount: number): number {
  return Math.max(2000, 400 + criteriaCount * 250);
}

export function buildEvaluationPrompt({
  employeeName,
  weekStart,
  weekEnd,
  dailyReports,
  weeklyReport,
  criteria,
  expectedDays,
}: {
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  dailyReports: DailyReport[];
  weeklyReport: WeeklyReport | null;
  criteria: EvaluationCriterion[];
  /** 稼働日数。休日・有給を除いた「本来提出されるべき日報の件数」。 */
  expectedDays: number;
}): string {
  const dailySection = dailyReports.length
    ? dailyReports
        .map((r) =>
          [
            `- ${r.report_date}${r.work_hours !== null ? `（工数${r.work_hours}h）` : ""}`,
            `  作業内容: ${r.work_content || "(記載なし)"}`,
            r.issues ? `  課題・気づき: ${r.issues}` : null,
            r.tomorrow_plan ? `  翌日の予定: ${r.tomorrow_plan}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n")
    : "（この週の日報は提出されていません）";

  const weeklySection = weeklyReport?.self_reflection
    ? weeklyReport.self_reflection
    : "（本人による週の振り返りコメントはありません）";

  const criteriaSection = criteria
    .map((c) => `- key: ${c.key} / 項目名: ${c.label}${c.description ? ` / 説明: ${c.description}` : ""}`)
    .join("\n");

  // 稼働日数を渡すのは、休日・有給の日に日報が無いことを「サボり」と読ませない
  // ため。カレンダー上の平日ではなく、実際に出勤した日だけを分母にする。
  const attendanceSection =
    expectedDays === dailyReports.length
      ? `この週の稼働日は${expectedDays}日で、日報は${dailyReports.length}件そろっています。`
      : `この週の稼働日は${expectedDays}日、提出された日報は${dailyReports.length}件です。` +
        `（稼働日以外の休日・有給の日は日報の提出対象ではありません）`;

  return `あなたは建設会社の人事評価を支援するAIアシスタントです。
以下は従業員「${employeeName}」の ${weekStart} 〜 ${weekEnd} の週の日報・週報です。
これらの内容だけを根拠に、指定された評価項目ごとに1〜5点のスコアと具体的なコメントを付け、
最後に週全体の総評（2〜4文程度）をまとめてください。

# 評価にあたっての注意
- 記載された事実の範囲でのみ評価し、記載のない事柄を推測で高評価/低評価にしないこと。
- 日報・週報の記載が乏しい場合は、その旨をコメントに明記し、無理に高得点をつけないこと。
- 提出対象外の日（休日・有給）に日報が無いことを、マイナス評価の理由にしないこと。
- コメントは上長が読んで参考にできる、具体的で簡潔な日本語にすること。
- これはあくまで上長が最終確認・修正する前提のドラフト評価です。断定的すぎる表現は避けること。
- 下記の評価項目は1つも飛ばさず、すべてについて採点すること。

# 評価項目
${criteriaSection}

# 稼働状況
${attendanceSection}

# 日報（${dailyReports.length}件）
${dailySection}

# 本人の週の振り返り
${weeklySection}
`;
}
