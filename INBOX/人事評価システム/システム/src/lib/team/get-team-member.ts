import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import type { Profile } from "@/types/database";

export async function requireManagerOrAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "manager" && profile.role !== "admin") {
    redirect("/");
  }
  return profile;
}

export async function getTeamMember(memberId: string): Promise<{ caller: Profile; member: Profile }> {
  const caller = await requireManagerOrAdmin();
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("*").eq("id", memberId).maybeSingle();

  if (!member) notFound();
  if (caller.role !== "admin" && member.manager_id !== caller.id) notFound();

  return { caller, member };
}
