import { createClient } from "@/lib/supabase/server";
import { JOB_GRADE_LABELS } from "@/lib/evaluation/score";
import { Card } from "@/components/ui/card";
import { MemberForm } from "./member-form";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("name");
  const profiles = data ?? [];

  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-md font-semibold text-app-text">設定が効くところ</h2>
        <ul className="mt-2 space-y-1 text-sm text-app-text-muted">
          <li>
            <strong className="font-semibold text-app-text">役職</strong>
            は期末評価の配点ウェイトを決めます（一般は行動指針が8割、部長は定量が5割）。
          </li>
          <li>
            <strong className="font-semibold text-app-text">上長</strong>
            は評価する人、その上長が二次承認者になります。
          </li>
          <li>
            <strong className="font-semibold text-app-text">権限</strong>
            はチーム画面・承認画面・この管理画面が見えるかどうかを決めます。
          </li>
        </ul>
      </Card>

      <div className="space-y-3">
        {profiles.map((profile) => (
          <MemberForm
            key={profile.id}
            profile={profile}
            colleagues={profiles.filter((p) => p.id !== profile.id)}
            managerName={profile.manager_id ? (nameById.get(profile.manager_id) ?? null) : null}
            gradeLabel={JOB_GRADE_LABELS[profile.job_grade]}
          />
        ))}
      </div>
    </div>
  );
}
