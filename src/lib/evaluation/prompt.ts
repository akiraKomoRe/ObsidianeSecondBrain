import type { DailyReport, EvaluationCriterion, WeeklyReport } from "@/types/database";

export function buildEvaluationPrompt({
  employeeName,
  weekStart,
  weekEnd,
  dailyReports,
  weeklyReport,
  criteria,
}: {
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  dailyReports: DailyReport[];
  weeklyReport: WeeklyReport | null;
  criteria: EvaluationCriterion[];
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

  return `あなたは建設会社の人事評価を支援するAIアシスタントです。
以下は従業員「${employeeName}」の ${weekStart} 〜 ${weekEnd} の週の日報・週報です。
これらの内容だけを根拠に、指定された評価項目ごとに1〜5点のスコアと具体的なコメントを付け、
最後に週全体の総評（2〜4文程度）をまとめてください。

# 評価にあたっての注意
- 記載された事実の範囲でのみ評価し、記載のない事柄を推測で高評価/低評価にしないこと。
- 日報・週報の記載が乏しい場合は、その旨をコメントに明記し、無理に高得点をつけないこと。
- コメントは上長が読んで参考にできる、具体的で簡潔な日本語にすること。
- これはあくまで上長が最終確認・修正する前提のドラフト評価です。断定的すぎる表現は避けること。

# 評価項目
${criteriaSection}

# 日報（${dailyReports.length}件）
${dailySection}

# 本人の週の振り返り
${weeklySection}
`;
}
