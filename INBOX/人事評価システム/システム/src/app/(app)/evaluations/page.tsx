import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { EvaluationList } from "@/components/reports/evaluation-list";

export default async function EvaluationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: evaluations } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", user!.id)
    .order("week_start", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
          <Sparkles className="h-5 w-5 text-app-accent" />
          AI週次評価
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          週報を提出するとAIがその週の日報・週報を読み、評価項目ごとのスコアとコメントを生成します。最終的な評価は上長が確認のうえ確定します。
        </p>
      </div>

      <EvaluationList evaluations={evaluations ?? []} basePath="/evaluations" />
    </div>
  );
}
