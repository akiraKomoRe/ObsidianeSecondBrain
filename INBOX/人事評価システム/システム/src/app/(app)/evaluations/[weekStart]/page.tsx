import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EvaluationDetailView } from "@/components/reports/evaluation-detail-view";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  const { weekStart } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: evaluation } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!evaluation) {
    notFound();
  }

  return <EvaluationDetailView evaluation={evaluation} backHref="/evaluations" />;
}
