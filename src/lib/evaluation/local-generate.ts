import type { CriterionScore, DailyReport, EvaluationCriterion, WeeklyReport } from "@/types/database";

/**
 * Weekly evaluation without the Claude API.
 *
 * This is not a mock that returns canned text. It reads the same reports the
 * prompt would have contained and derives each score from what is actually
 * written, so entering a different day's work changes the result -- which is
 * the whole point of demonstrating the flow before the API is connected.
 *
 * It is a keyword-and-coverage heuristic, not a judgement of the work, and
 * the caller stamps `model_version = "local-rule-based"` so every screen can
 * say so out loud. Nobody should mistake this for the AI's output.
 */

export const LOCAL_MODEL_VERSION = "local-rule-based";

/** Words that indicate a criterion was actually engaged with that week. */
const SIGNALS: Record<string, string[]> = {
  safety: ["安全", "KY", "ヒヤリ", "危険", "養生", "パトロール", "保護具", "是正"],
  quality: ["品質", "図面", "仕様", "精度", "検査", "施工図", "手直し", "照合", "配筋"],
  schedule: ["工程", "進捗", "段取り", "納期", "遅延", "スケジュール", "打設", "搬入"],
  cost_awareness: ["原価", "コスト", "数量", "発注", "在庫", "手待ち", "資材", "精査", "融通"],
  teamwork: ["連携", "打ち合わせ", "共有", "報連相", "協力", "相談", "朝礼", "立ち会い"],
  initiative: ["提案", "改善", "自ら", "工夫", "見直し", "主体", "推進", "調整"],
  growth: ["学習", "資格", "研修", "習得", "勉強", "振り返り", "試験", "受験"],
};

/**
 * Deterministic: the same reports always produce the same score.
 *
 * Scored on evidence *density* -- matches per day reported -- rather than a
 * raw match count. A raw count rewards simply writing more, and over a week of
 * reports almost every criterion picks up a few keywords, which produced a
 * uniform 5/5 and made the whole thing look like a rubber stamp. Density asks
 * the sharper question: did this come up repeatedly, or once in passing?
 */
function scoreFor(criterion: EvaluationCriterion, corpus: string, days: number): number {
  const words = SIGNALS[criterion.key] ?? [];
  const hits = words.filter((word) => corpus.includes(word)).length;
  if (hits === 0) return 2; // recorded nothing on this -- not a 1, that implies a judgement
  if (hits === 1) return 3; // mentioned once: present, but nothing to distinguish it

  // Beyond a single mention, ask whether it recurred relative to how much was
  // written. Distinct signals alone would reward one very detailed day; density
  // alone would give a single-day week a 5 for one keyword. Both must hold.
  const density = hits / Math.max(1, days);
  if (hits >= 3 && density >= 0.75) return 5;
  if (density >= 0.5) return 4;
  return 3;
}

function commentFor(criterion: EvaluationCriterion, corpus: string, score: number): string {
  const mentioned = (SIGNALS[criterion.key] ?? []).filter((word) => corpus.includes(word));
  const evidence = mentioned.length
    ? `日報中の「${mentioned.slice(0, 3).join("」「")}」に関する記述を根拠としています。`
    : "この項目に関する具体的な記述が日報・週報に見当たりませんでした。";

  const judgement =
    score >= 5
      ? "週を通して繰り返し記録されており、継続的に取り組めていた様子が読み取れます。"
      : score === 4
        ? "複数日にわたって記録が残っています。"
        : score === 3
          ? "記録はありますが、単発的です。"
          : "記録が乏しく、この項目については判断材料が不足しています。";

  return `${judgement}${evidence}`;
}

export function generateLocalEvaluation({
  employeeName,
  dailyReports,
  weeklyReport,
  criteria,
  expectedDays = 5,
}: {
  employeeName: string;
  dailyReports: DailyReport[];
  weeklyReport: WeeklyReport | null;
  criteria: EvaluationCriterion[];
  /** Working days in the week, used to judge how complete the record is. */
  expectedDays?: number;
}): { criteriaScores: CriterionScore[]; overallSummary: string } {
  const corpus = [
    ...dailyReports.flatMap((report) => [
      report.work_content,
      report.issues ?? "",
      report.tomorrow_plan ?? "",
    ]),
    weeklyReport?.self_reflection ?? "",
  ].join("\n");

  const criteriaScores: CriterionScore[] = criteria.map((criterion) => {
    const score = scoreFor(criterion, corpus, dailyReports.length);
    return {
      key: criterion.key,
      label: criterion.label,
      score,
      comment: commentFor(criterion, corpus, score),
    };
  });

  const average =
    criteriaScores.reduce((sum, item) => sum + item.score, 0) / (criteriaScores.length || 1);
  const strongest = [...criteriaScores].sort((a, b) => b.score - a.score)[0];
  const weakest = [...criteriaScores].sort((a, b) => a.score - b.score)[0];

  const submission =
    dailyReports.length >= expectedDays
      ? `日報は${dailyReports.length}件そろっています。`
      : `日報は${dailyReports.length}/${expectedDays}件で、記録が途切れている日があります。`;

  const overallSummary = [
    `${employeeName}さんの今週は、平均${average.toFixed(1)}点（5点満点）でした。`,
    submission,
    strongest && weakest && strongest.key !== weakest.key
      ? `特に「${strongest.label}」の記述が充実しており、「${weakest.label}」については記録が手薄でした。`
      : "",
    "※ この評価はAI未接続のため、日報・週報の記述内容からローカルで機械的に算出したものです。記述の量と繰り返しを見ているだけで、仕事の中身は評価していません。上長が内容を確認してください。",
  ]
    .filter(Boolean)
    .join(" ");

  return { criteriaScores, overallSummary };
}
