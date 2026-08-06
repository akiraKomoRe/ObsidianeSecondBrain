import type { Profile } from "@/types/database";

export type TeamMemberSummary = {
  profile: Profile;
  todayReportSubmitted: boolean;
  weekReportSubmitted: boolean;
  latestEvaluation: { weekStart: string; avgScore: number | null } | null;
};
