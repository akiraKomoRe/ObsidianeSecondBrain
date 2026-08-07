import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getTeamMember } from "@/lib/team/get-team-member";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MemberTabs } from "./member-tabs";

export default async function TeamMemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);
  const initial = member.name ? member.name.charAt(0) : member.email.charAt(0);

  return (
    <div className="space-y-5">
      <Link
        href="/team"
        className="flex items-center gap-1 text-sm text-app-text-muted hover:text-app-text hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        チーム一覧に戻る
      </Link>

      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="text-base">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-app-text">{member.name}</h1>
          <p className="truncate text-sm text-app-text-muted">{member.department ?? member.email}</p>
        </div>
      </div>

      <MemberTabs memberId={memberId} />

      {children}
    </div>
  );
}
