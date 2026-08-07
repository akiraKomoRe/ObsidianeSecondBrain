// Scoring for the term (半期) evaluation sheet.
//
// This is a direct port of the formulas in the company's existing Excel sheet
// (新評価シート（原本）), so the numbers this produces must match what managers
// are used to seeing. Per category the sheet computes:
//
//   =(SUM(scores) / (COUNTA(scores) * 5)) * weight * 100
//
// and sums the three categories into a 100-point total. Two details of that
// formula matter and are easy to get wrong:
//
//   * COUNTA counts *filled* cells, so an unscored goal shrinks the denominator
//     rather than counting as a zero. A half-graded sheet therefore shows the
//     average of what has been graded so far, not a depressed score.
//   * The weight comes from the employee's job grade, not their permission
//     role — see JOB_GRADE_WEIGHTS.

export const EVALUATION_CATEGORIES = ["quantitative", "behavioral", "development"] as const;
export type EvaluationCategory = (typeof EVALUATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<EvaluationCategory, string> = {
  quantitative: "部門定量項目",
  behavioral: "行動指針項目",
  development: "育成・支援・管理・自己研鑽項目",
};

export const JOB_GRADES = ["director", "bucho", "kacho", "kakaricho", "shunin", "ippan"] as const;
export type JobGrade = (typeof JOB_GRADES)[number];

export const JOB_GRADE_LABELS: Record<JobGrade, string> = {
  director: "取締役",
  bucho: "部長",
  kacho: "課長",
  kakaricho: "係長",
  shunin: "主任",
  ippan: "一般",
};

export type CategoryWeights = Record<EvaluationCategory, number>;

/** Mirrors the 役職別評価ウェイト sheet. Each row sums to 1.0. */
export const JOB_GRADE_WEIGHTS: Record<JobGrade, CategoryWeights> = {
  director: { quantitative: 0, behavioral: 0.5, development: 0.5 },
  bucho: { quantitative: 0.5, behavioral: 0.1, development: 0.4 },
  kacho: { quantitative: 0.4, behavioral: 0.3, development: 0.3 },
  kakaricho: { quantitative: 0.3, behavioral: 0.5, development: 0.2 },
  shunin: { quantitative: 0.2, behavioral: 0.7, development: 0.1 },
  ippan: { quantitative: 0.1, behavioral: 0.8, development: 0.1 },
};

/** Each goal is graded out of 5 on the paper sheet. */
export const MAX_ITEM_SCORE = 5;

/** Which column of scores to total — the sheet carries three in parallel. */
export type ScoreColumn = "self" | "manager" | "final";

export type EvaluationItem = {
  category: EvaluationCategory;
  selfScore: number | null;
  managerScore: number | null;
  finalScore: number | null;
};

function pickScore(item: EvaluationItem, column: ScoreColumn): number | null {
  if (column === "self") return item.selfScore;
  if (column === "manager") return item.managerScore;
  return item.finalScore;
}

export type CategoryScore = {
  category: EvaluationCategory;
  weight: number;
  /** Goals in this category that carry a score. Excel's COUNTA. */
  scoredCount: number;
  /** Goals in this category regardless of whether they are scored yet. */
  itemCount: number;
  /** Contribution to the 100-point total. */
  points: number;
};

export type TermScore = {
  categories: CategoryScore[];
  /** Sum of the category contributions, out of 100. */
  total: number;
  /** False while any goal is still ungraded — the total is partial. */
  complete: boolean;
};

/**
 * Score one column of a term evaluation, reproducing the Excel sheet exactly.
 *
 * A category with no scored goals contributes 0 rather than erroring. The Excel
 * sheet shows #DIV/0! there, but that is a spreadsheet artifact rather than an
 * intended behaviour, and a half-filled sheet is the normal state for most of
 * the period.
 */
export function calculateTermScore(
  items: EvaluationItem[],
  weights: CategoryWeights,
  column: ScoreColumn
): TermScore {
  const categories = EVALUATION_CATEGORIES.map<CategoryScore>((category) => {
    const inCategory = items.filter((item) => item.category === category);
    const scores = inCategory
      .map((item) => pickScore(item, column))
      .filter((score): score is number => score !== null);

    const weight = weights[category];
    const points =
      scores.length === 0
        ? 0
        : (scores.reduce((sum, score) => sum + score, 0) / (scores.length * MAX_ITEM_SCORE)) *
          weight *
          100;

    return {
      category,
      weight,
      scoredCount: scores.length,
      itemCount: inCategory.length,
      points,
    };
  });

  return {
    categories,
    total: categories.reduce((sum, category) => sum + category.points, 0),
    complete: items.every((item) => pickScore(item, column) !== null),
  };
}

/** Display helper — the sheet shows whole-ish numbers, not raw floats. */
export function formatPoints(points: number): string {
  return points.toFixed(1);
}
