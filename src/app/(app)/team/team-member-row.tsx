import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { TeamMemberSummary } from "@/lib/team/types";

export function TeamMemberRow({ summary }: { summary: TeamMemberSummary }) {
  const { profile, todayReportSubmitted, weekReportSubmitted, latestEvaluation } = summary;
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <li>
      <Link
        href={`/team/${profile.id}`}
        className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-app-card-hover"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-sm font-semibold text-app-accent">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-app-text">{profile.name}</p>
            <p className="truncate text-xs text-app-text-faint">{profile.department ?? profile.email}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden flex-col items-end gap-1 sm:flex">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                todayReportSubmitted ? "bg-app-success-soft text-app-success" : "bg-app-accent-soft text-app-accent"
              }`}
            >
              本日{todayReportSubmitted ? "提出済み" : "未提出"}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                weekReportSubmitted ? "bg-app-success-soft text-app-success" : "bg-app-accent-soft text-app-accent"
              }`}
            >
              今週{weekReportSubmitted ? "提出済み" : "未提出"}
            </span>
          </div>

          <EvaluationBadge latestEvaluation={latestEvaluation} />

          <ChevronRight className="h-4 w-4 text-app-text-faint" />
        </div>
      </Link>
    </li>
  );
}

function EvaluationBadge({ latestEvaluation }: { latestEvaluation: TeamMemberSummary["latestEvaluation"] }) {
  if (!latestEvaluation || latestEvaluation.avgScore === null) {
    return <span className="w-16 shrink-0 whitespace-nowrap text-right text-xs text-app-text-faint">データなし</span>;
  }

  return (
    <span className="w-16 shrink-0 whitespace-nowrap text-right text-sm font-semibold text-app-text">
      {latestEvaluation.avgScore.toFixed(1)}
      <span className="font-normal text-app-text-faint"> / 5</span>
    </span>
  );
}
