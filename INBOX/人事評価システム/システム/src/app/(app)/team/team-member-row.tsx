"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { TeamMemberSummary } from "@/lib/team/types";

export function TeamMemberRow({ summary }: { summary: TeamMemberSummary }) {
  const { profile, todayReportSubmitted, weekReportSubmitted, latestEvaluation } = summary;
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);
  const router = useRouter();
  const href = `/team/${profile.id}`;

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href)}>
      <TableCell>
        <Link
          href={href}
          className="flex min-w-0 items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-app-text">{profile.name}</span>
            <span className="block truncate text-xs text-app-text-faint">
              {profile.department ?? profile.email}
            </span>
          </span>
        </Link>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <Badge variant={todayReportSubmitted ? "success" : "accent"}>
          本日{todayReportSubmitted ? "提出済み" : "未提出"}
        </Badge>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <Badge variant={weekReportSubmitted ? "success" : "accent"}>
          今週{weekReportSubmitted ? "提出済み" : "未提出"}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <EvaluationBadge latestEvaluation={latestEvaluation} />
      </TableCell>

      <TableCell className="w-8 px-2">
        <ChevronRight className="h-4 w-4 text-app-text-faint" />
      </TableCell>
    </TableRow>
  );
}

function EvaluationBadge({ latestEvaluation }: { latestEvaluation: TeamMemberSummary["latestEvaluation"] }) {
  if (!latestEvaluation || latestEvaluation.avgScore === null) {
    return <span className="whitespace-nowrap text-xs text-app-text-faint">データなし</span>;
  }

  return (
    <span className="whitespace-nowrap text-sm font-semibold text-app-text">
      {latestEvaluation.avgScore.toFixed(1)}
      <span className="font-normal text-app-text-faint"> / 5</span>
    </span>
  );
}
