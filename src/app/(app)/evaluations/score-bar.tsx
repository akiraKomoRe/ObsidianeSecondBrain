export function scoreColorClass(score: number): string {
  if (score >= 4) return "bg-app-success";
  if (score >= 3) return "bg-app-accent";
  return "bg-app-danger";
}

export function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-app-border-soft">
      <div className={`h-full rounded-full ${scoreColorClass(score)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function avgScoreOf(scores: { score: number }[]): number | null {
  return scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;
}
