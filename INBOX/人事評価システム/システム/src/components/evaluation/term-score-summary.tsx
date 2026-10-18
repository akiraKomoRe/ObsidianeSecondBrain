import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_LABELS, formatPoints, type TermScore } from "@/lib/evaluation/score";

/**
 * The 100-point breakdown that mirrors the bottom of the paper sheet.
 *
 * The weight is shown next to each category because the same raw scores
 * produce very different totals across job grades -- a 一般 employee's
 * behavioral marks carry 0.8 of the total where a 部長's carry 0.1, and
 * without that on screen the arithmetic looks arbitrary.
 */
export function TermScoreSummary({
  score,
  label,
  tone = "default",
}: {
  score: TermScore;
  label: string;
  tone?: "default" | "final";
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-md font-semibold text-app-text">{label}</h2>
        <p className="tabular text-2xl font-bold text-app-text">
          {formatPoints(score.total)}
          <span className="text-base font-medium text-app-text-faint"> / 100</span>
        </p>
      </div>

      {!score.complete ? (
        <p className="text-xs text-app-text-faint">
          未採点の項目があるため、現時点までの記入分で計算しています。
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {score.categories.map((category) => (
          <li key={category.category} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-app-text-muted">
                {CATEGORY_LABELS[category.category]}
                <span className="ml-1.5 text-app-text-faint">
                  ウェイト {category.weight}
                </span>
              </span>
              <span className="tabular font-semibold text-app-text">
                {formatPoints(category.points)}
                <span className="font-normal text-app-text-faint">
                  {" "}
                  / {formatPoints(category.weight * 100)}
                </span>
              </span>
            </div>
            <Progress
              value={category.weight === 0 ? 0 : (category.points / (category.weight * 100)) * 100}
              indicatorClassName={tone === "final" ? "bg-app-success" : "bg-primary"}
            />
            <p className="text-[11px] text-app-text-faint">
              {category.scoredCount} / {category.itemCount} 項目を採点済み
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
