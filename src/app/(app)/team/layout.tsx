import { requireManagerOrAdmin } from "@/lib/team/get-team-member";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireManagerOrAdmin();
  return <>{children}</>;
}
