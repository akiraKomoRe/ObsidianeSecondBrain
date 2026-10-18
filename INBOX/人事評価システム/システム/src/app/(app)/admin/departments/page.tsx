import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DepartmentForm } from "./department-form";

export default async function AdminDepartmentsPage() {
  const supabase = await createClient();
  const [{ data: departments }, { data: profiles }] = await Promise.all([
    supabase.from("departments").select("*").order("sort_order"),
    supabase.from("profiles").select("*").order("name"),
  ]);

  const all = departments ?? [];
  const people = profiles ?? [];
  const memberCount = new Map<string, number>();
  for (const person of people) {
    if (!person.department_id) continue;
    memberCount.set(person.department_id, (memberCount.get(person.department_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-md font-semibold text-app-text">設定が効くところ</h2>
        <ul className="mt-2 space-y-1 text-sm text-app-text-muted">
          <li>
            <strong className="font-semibold text-app-text">部長</strong>
            に指定された人だけが、その部署の部門目標を登録・編集できます。
          </li>
          <li>
            <strong className="font-semibold text-app-text">上位部署</strong>
            を設定すると、下位部署の社員は上位部署の部門目標も自分の目標に紐づけられます。
            上位部署の部長は、配下の部署の目標も定められます。
          </li>
        </ul>
      </Card>

      <DepartmentForm department={null} departments={all} people={people} />

      <div className="space-y-3">
        {all.map((department) => (
          <DepartmentForm
            key={department.id}
            department={department}
            departments={all}
            people={people}
            memberCount={memberCount.get(department.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
