import { Progress } from "@/components/ui/progress";

export function scoreColorClass(score: number): string {
  if (score >= 4) return "bg-app-success";
  if (score >= 3) return "bg-primary";
  return "bg-app-danger";
}

export function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return <Progress value={pct} indicatorClassName={scoreColorClass(score)} />;
}

export function avgScoreOf(scores: { score: number }[]): number | null {
  return scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;
}
