import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";

import { createLocalClient } from "./client.ts";
import { buildSeed } from "./seed.ts";
import { loadTables, resetStoreCache } from "./store.ts";

/**
 * The local mode's answer to `supabase/tests/01_term_evaluation_rls.sql`.
 *
 * `src/lib/evaluation/get-term.ts` deliberately does not re-check who may read
 * the manager's marks -- it delegates that to the row-level policy, on the
 * grounds that the storage layer is the thing that has to be right. With no
 * database, this file is what proves the storage layer still is. The cases
 * below are the same matrix the SQL test asserts, so the two modes can be
 * compared row for row.
 */

const YAMADA = "11111111-1111-4111-8111-111111111111"; // 一般職・本人
const SUZUKI = "22222222-2222-4222-8222-222222222222"; // 同僚（無関係）
const SATO = "33333333-3333-4333-8333-333333333333"; // 山田の上長
const TANAKA = "44444444-4444-4444-8444-444444444444"; // 佐藤の上長 = 二次承認者
const ADMIN = "55555555-5555-4555-8555-555555555555";
const TERM = "bbbbbbbb-0000-4000-8000-000000000001"; // 山田の2026上期
const TERM_PERIOD_CLOSED = "aaaaaaaa-0000-4000-8000-000000000001"; // 2026上期（締切済み）

const as = (id: string | null) => createLocalClient(id ? { id } : null);

/**
 * The local client's result type is a union (a list, one row, or null) because
 * it mirrors PostgREST rather than Supabase's generated types. In the app the
 * generated types narrow it; here the tests say which shape they asked for.
 */
type Cell = Record<string, unknown>;
const rows = (result: { data: unknown }) => result.data as Cell[];

beforeEach(() => {
  // A fresh file per test, so a mutation in one case cannot leak into another.
  process.env.LOCAL_DB_PATH = join(mkdtempSync(join(tmpdir(), "hr-local-")), "db.json");
  resetStoreCache();
});

/** Move the seeded sheet to disclosed, the way discloseTermEvaluation does. */
function disclose() {
  const evaluation = loadTables().term_evaluations.find((e) => e.id === TERM)!;
  evaluation.disclosed_at = new Date().toISOString();
}

describe("上長評価の公開前ブラックアウト", () => {
  test("公開前・本人: 目標は見えるが上長評価は0件", async () => {
    const { data: items } = await as(YAMADA)
      .from("term_evaluation_items")
      .select("*")
      .eq("term_evaluation_id", TERM);
    const { data: marks } = await as(YAMADA)
      .from("term_evaluation_marks")
      .select("*")
      .eq("term_evaluation_id", TERM);

    assert.equal(items!.length, 10);
    assert.equal(marks!.length, 0, "面談前に上長評点が本人へ漏れている");
  });

  test("公開前・上長と二次承認者: 上長評価が見える", async () => {
    for (const viewer of [SATO, TANAKA, ADMIN]) {
      const { data } = await as(viewer)
        .from("term_evaluation_marks")
        .select("*")
        .eq("term_evaluation_id", TERM);
      assert.equal(data!.length, 10, `${viewer} から上長評価が見えていない`);
    }
  });

  test("同僚どうしは互いの目標も上長評価も見えない", async () => {
    // 山田と鈴木は同じ佐藤の部下だが、横並びの関係。互いの評価は見えない。
    const { data: items } = await as(SUZUKI)
      .from("term_evaluation_items")
      .select("*")
      .eq("term_evaluation_id", TERM);
    const { data: marks } = await as(SUZUKI)
      .from("term_evaluation_marks")
      .select("*")
      .eq("term_evaluation_id", TERM);
    assert.equal(rows({ data: items }).length, 0, "同僚の目標が見えている");
    assert.equal(rows({ data: marks }).length, 0, "同僚の上長評価が見えている");
  });

  test("公開後・本人: 上長評価が見える", async () => {
    disclose();
    const { data } = await as(YAMADA)
      .from("term_evaluation_marks")
      .select("*")
      .eq("term_evaluation_id", TERM);
    assert.equal(data!.length, 10);
  });

  test("本人は上長評価を書き換えられない（公開後も）", async () => {
    disclose();
    const { data } = await as(YAMADA)
      .from("term_evaluation_marks")
      .update({ manager_score: 5 })
      .eq("term_evaluation_id", TERM)
      .select("item_id");

    assert.equal(data!.length, 0, "本人が自分の評点を書き換えられている");
    const stored = loadTables()
      .term_evaluation_marks.filter((m) => m.term_evaluation_id === TERM)
      .map((m) => m.manager_score);
    assert.ok(!stored.includes(5), "書き換えが通ってしまっている");
  });
});

describe("承認依頼後の凍結", () => {
  test("承認依頼後に本人が目標を更新しても0行", async () => {
    // 種データは approved。draft に戻せば編集できることも併せて確かめる。
    const { data: blocked } = await as(YAMADA)
      .from("term_evaluation_items")
      .update({ title: "書き換え" })
      .eq("term_evaluation_id", TERM)
      .select("id");
    assert.equal(blocked!.length, 0, "承認済みの目標が本人に書き換えられている");

    loadTables().term_evaluations.find((e) => e.id === TERM)!.status = "draft";

    const { data: allowed } = await as(YAMADA)
      .from("term_evaluation_items")
      .update({ self_comment: "追記" })
      .eq("term_evaluation_id", TERM)
      .select("id");
    assert.equal(allowed!.length, 10, "下書きなのに本人が編集できていない");
  });

  test("本人は自分の評価のstatusを勝手にapprovedにできない", async () => {
    loadTables().term_evaluations.find((e) => e.id === TERM)!.status = "draft";
    const { data } = await as(YAMADA)
      .from("term_evaluations")
      .update({ status: "approved" })
      .eq("id", TERM)
      .select("id");
    // WITH CHECK 相当: 更新後の行もポリシーを満たす必要がある。
    assert.equal(data!.length, 0, "本人が自分で承認済みにできている");
  });
});

describe("サービスロール", () => {
  test("viewer=null はポリシーを迂回する（週次AI評価の書き込み用）", async () => {
    const { data } = await as(null)
      .from("term_evaluation_marks")
      .select("*")
      .eq("term_evaluation_id", TERM);
    assert.equal(rows({ data }).length, 10);
  });
});

describe("クエリビルダの互換性", () => {
  test("eq / order / limit / maybeSingle", async () => {
    const recent = await as(YAMADA)
      .from("daily_reports")
      .select("*")
      .eq("user_id", YAMADA)
      .order("report_date", { ascending: false })
      .limit(2);
    assert.deepEqual(
      rows(recent).map((r) => r.report_date),
      ["2026-08-06", "2026-08-05"]
    );

    const { data: one } = await as(YAMADA)
      .from("daily_reports")
      .select("*")
      .eq("report_date", "2026-08-06")
      .maybeSingle();
    assert.equal((one as { work_hours: number }).work_hours, 8);

    const { data: none } = await as(YAMADA)
      .from("daily_reports")
      .select("*")
      .eq("report_date", "1999-01-01")
      .maybeSingle();
    assert.equal(none, null);
  });

  test("gte / lte で期間を絞れる", async () => {
    const { data } = await as(YAMADA)
      .from("daily_reports")
      .select("*")
      .gte("report_date", "2026-08-03")
      .lte("report_date", "2026-08-09");
    assert.equal(data!.length, 4);
  });

  test("count: exact / head: true は行を返さず件数だけ返す", async () => {
    const { data, count } = await as(YAMADA)
      .from("term_evaluation_items")
      .select("id", { count: "exact", head: true })
      .eq("term_evaluation_id", TERM)
      .eq("category", "behavioral");
    assert.equal(data, null);
    assert.equal(count, 5);
  });

  test("insert().select().single() は作られた行を返し、id を採番する", async () => {
    const { data, error } = await as(YAMADA)
      .from("daily_reports")
      .insert({ user_id: YAMADA, report_date: "2026-08-10", work_content: "テスト" })
      .select("*")
      .single();
    assert.equal(error, null);
    assert.ok((data as { id: string }).id);
    assert.ok((data as { created_at: string }).created_at);
  });

  test("省略した列は undefined ではなく null で入る（Postgresと同じ）", async () => {
    // undefined と null は交換可能ではない。`!== null` を通り抜けた undefined が
    // 期末評価の合計を NaN にした実際の不具合があるため、ここで揃えている。
    loadTables().term_evaluations.find((e) => e.id === TERM)!.status = "draft";
    const { data, error } = await as(YAMADA)
      .from("term_evaluation_items")
      .insert({ term_evaluation_id: TERM, category: "quantitative", sort_order: 9, title: "新目標" })
      .select("*")
      .single();

    assert.equal(error, null);
    const row = data as Cell;
    for (const column of ["self_score", "self_comment", "midterm_progress", "midterm_self_score"]) {
      assert.equal(row[column], null, `${column} が null になっていない`);
      assert.ok(column in row, `${column} が行に存在しない`);
    }
  });

  test("一意制約の違反は 23505 で返る", async () => {
    const { error } = await as(YAMADA)
      .from("daily_reports")
      .insert({ user_id: YAMADA, report_date: "2026-08-06", work_content: "重複" });
    assert.equal(error?.code, "23505");
  });

  test("upsert(onConflict) は既存行を更新し、重複を作らない", async () => {
    const before = loadTables().term_evaluation_marks.length;
    const itemId = loadTables().term_evaluation_items[0].id;

    await as(SATO)
      .from("term_evaluation_marks")
      .upsert(
        { item_id: itemId, term_evaluation_id: TERM, manager_score: 5, final_score: 5 },
        { onConflict: "item_id" }
      );

    const marks = loadTables().term_evaluation_marks;
    assert.equal(marks.length, before);
    assert.equal(marks.find((m) => m.item_id === itemId)!.manager_score, 5);
  });

  test("select の列指定は指定した列だけを返す", async () => {
    const result = await as(YAMADA).from("daily_reports").select("report_date").limit(1);
    assert.deepEqual(Object.keys(rows(result)[0]), ["report_date"]);
  });
});

describe("承認フロー中の書き込み可否（監査で見つかった不備の回帰）", () => {
  test("上長は部下の評点を書けるが、無関係な社員は書けない", async () => {
    const itemId = loadTables().term_evaluation_items[0].id;
    const mark = { item_id: itemId, term_evaluation_id: TERM, manager_score: 5, final_score: 5 };

    const { data: stranger } = await as(SUZUKI)
      .from("term_evaluation_marks")
      .upsert(mark, { onConflict: "item_id" })
      .select("item_id");
    assert.equal(rows({ data: stranger }).length, 0, "無関係な社員が評点を書けている");

    const { data: manager } = await as(SATO)
      .from("term_evaluation_marks")
      .upsert(mark, { onConflict: "item_id" })
      .select("item_id");
    assert.equal(rows({ data: manager }).length, 1);
  });

  test("本人は他人の評価シートを読めない", async () => {
    const { data } = await as(YAMADA).from("term_evaluations").select("*").eq("user_id", SUZUKI);
    assert.equal(rows({ data }).length, 0);
  });

  test("上長は部下のプロフィールを読めるが、部下は上長を読めない", async () => {
    const { data: down } = await as(SATO).from("profiles").select("*").eq("id", YAMADA);
    assert.equal(rows({ data: down }).length, 1);

    const { data: up } = await as(YAMADA).from("profiles").select("*").eq("id", SATO);
    assert.equal(rows({ data: up }).length, 0);
  });

  test("二次承認者は対象者のプロフィールを読める（承認待ち画面に氏名を出すため）", async () => {
    const { data } = await as(TANAKA).from("profiles").select("*").eq("id", YAMADA);
    assert.equal(rows({ data }).length, 1, "承認依頼の相手が誰か分からない状態になっている");
  });

  test("管理者以外は評価期間を作れない", async () => {
    const period = { year: 2027, half: "H1", starts_on: "2027-01-01", ends_on: "2027-06-30" };

    const { error } = await as(SATO).from("evaluation_periods").insert(period);
    assert.equal(error?.code, "42501", "管理者でない人が期を作れている");

    const { error: adminError } = await as(ADMIN).from("evaluation_periods").insert(period);
    assert.equal(adminError, null);
  });

  test("本人は自分の氏名は直せるが、役職は直せない", async () => {
    const { data: name } = await as(YAMADA)
      .from("profiles")
      .update({ name: "山田 太郎（改）" })
      .eq("id", YAMADA)
      .select("id");
    assert.equal(rows({ data: name }).length, 1, "自分の氏名すら直せない");

    // 役職は配点ウェイトを決める＝賞与に直結するので、本人には触らせない。
    const { error } = await as(YAMADA)
      .from("profiles")
      .update({ job_grade: "bucho" })
      .eq("id", YAMADA);
    assert.equal(error?.code, "42501", "本人が自分の役職を上げられている");
    assert.equal(loadTables().profiles.find((p) => p.id === YAMADA)!.job_grade, "ippan");
  });

  test("管理者だけが役職・上長を変更できる", async () => {
    const { data: byStranger } = await as(SUZUKI)
      .from("profiles")
      .update({ name: "乗っ取り" })
      .eq("id", YAMADA)
      .select("id");
    assert.equal(rows({ data: byStranger }).length, 0, "他人のプロフィールを書き換えられている");

    const { data: byAdmin } = await as(ADMIN)
      .from("profiles")
      .update({ manager_id: TANAKA, job_grade: "shunin" })
      .eq("id", YAMADA)
      .select("id");
    assert.equal(rows({ data: byAdmin }).length, 1);
    assert.equal(loadTables().profiles.find((p) => p.id === YAMADA)!.job_grade, "shunin");
  });
});

describe("部門目標の編集権限", () => {
  const HONBU = "dddddddd-0000-4000-8000-000000000001"; // 工事本部（田中が部長）
  const ICHIKA = "dddddddd-0000-4000-8000-000000000002"; // 工事第一課（佐藤が課長）
  const H2 = "aaaaaaaa-0000-4000-8000-000000000002"; // 開いている期

  const addGoal = (viewerId: string, departmentId: string, periodId = H2) =>
    as(viewerId)
      .from("department_goals")
      .insert({ department_id: departmentId, period_id: periodId, title: "テスト目標" });

  test("部長は自部署の部門目標を追加できる", async () => {
    const { error } = await addGoal(TANAKA, HONBU);
    assert.equal(error, null);
  });

  test("部長は配下の課の部門目標も追加できる（上位部署の長として）", async () => {
    const { error } = await addGoal(TANAKA, ICHIKA);
    assert.equal(error, null, "本部長が配下の課の目標を立てられない");
  });

  test("課長は自分の課の部門目標を追加できる", async () => {
    const { error } = await addGoal(SATO, ICHIKA);
    assert.equal(error, null);
  });

  /**
   * ここが肝。部門目標は全社員が読めるが、書けるのはその部署と上位部署の長だけ。
   * 課長が本部の目標を書き換えられると、部長の方針を部下が上書きできてしまう。
   */
  test("課長は上位部署（本部）の部門目標を追加できない", async () => {
    const { error } = await addGoal(SATO, HONBU);
    assert.ok(error, "課長が本部の目標を立てられてしまった");
  });

  test("一般社員はどの部署の部門目標も追加できない", async () => {
    for (const dept of [HONBU, ICHIKA]) {
      const { error } = await addGoal(YAMADA, dept);
      assert.ok(error, `一般社員が ${dept} の目標を立てられてしまった`);
    }
  });

  test("管理者はどの部署の部門目標も追加できる", async () => {
    const { error } = await addGoal(ADMIN, ICHIKA);
    assert.equal(error, null);
  });

  /**
   * 締めた期の目標が動かせると、確定済みの期末評価の根拠があとから書き換わる。
   * 規程 第12条の不服申立てで見るべきものが消えてしまう。
   */
  test("締切済みの期は部長でも部門目標を追加できない", async () => {
    const { error } = await addGoal(TANAKA, HONBU, TERM_PERIOD_CLOSED);
    assert.ok(error, "締切済みの期に目標を足せてしまった");
  });

  test("部門目標は全社員が読める（自分の目標の紐付け先を選ぶために要る）", async () => {
    for (const viewer of [YAMADA, SUZUKI, SATO, TANAKA, ADMIN]) {
      const goals = rows(await as(viewer).from("department_goals").select("*"));
      assert.ok(goals.length > 0, `${viewer} が部門目標を読めない`);
    }
  });

  /**
   * 0006 の CHECK 制約と同じこと。ポリシー（誰が触れるか）とは別の層で、
   * 「その行がそもそも成立するか」を見る。
   *
   * シートを draft に戻してから試すのが要点。承認済みのままだとポリシーの
   * 段階で1行も掴めず、CHECK まで到達しないので何も検証できない
   * ——「エラーが出ない」を「制約が効いた」と読み違えるところだった。
   */
  test("部門定量項目以外に部門目標を紐づけられない", async () => {
    const tables = loadTables();
    tables.term_evaluations.find((e) => e.id === TERM)!.status = "draft";
    const behavioral = tables.term_evaluation_items.find(
      (item) => item.term_evaluation_id === TERM && item.category === "behavioral"
    )!;

    const { error } = await as(YAMADA)
      .from("term_evaluation_items")
      .update({ department_goal_id: "eeeeeeee-0000-4000-8000-000000000011" })
      .eq("id", behavioral.id);

    assert.ok(error, "行動指針の項目に部門目標が紐づいてしまった");
    assert.equal(error?.code, "23514");
  });

  test("部門定量項目には紐づけられる", async () => {
    const tables = loadTables();
    tables.term_evaluations.find((e) => e.id === TERM)!.status = "draft";
    const quantitative = tables.term_evaluation_items.find(
      (item) => item.term_evaluation_id === TERM && item.category === "quantitative"
    )!;

    const { error } = await as(YAMADA)
      .from("term_evaluation_items")
      .update({ department_goal_id: "eeeeeeee-0000-4000-8000-000000000011" })
      .eq("id", quantitative.id);

    assert.equal(error, null);
  });
});

describe("休暇情報の可視範囲", () => {
  /**
   * 誰がいつ何で休んだかは人事情報で、同僚どうしで横に見えてはいけない。
   * 稼働日を数えるためだけに置いたテーブルが、休職や通院の推測材料になっては
   * 本末転倒なので、評価本体と同じ三者（本人・上長・管理者）に閉じる。
   */
  const leavesFor = async (viewerId: string) =>
    rows(await as(viewerId).from("personal_leaves").select("*").eq("user_id", YAMADA));

  test("本人は自分の休暇が見える", async () => {
    assert.ok((await leavesFor(YAMADA)).length > 0);
  });

  test("上長・二次承認者・管理者は部下の休暇が見える", async () => {
    for (const viewer of [SATO, TANAKA, ADMIN]) {
      assert.ok((await leavesFor(viewer)).length > 0, `${viewer} が見られない`);
    }
  });

  test("同僚どうしは互いの休暇が見えない", async () => {
    assert.equal((await leavesFor(SUZUKI)).length, 0);
  });

  test("会社休日は全員が見える（今日提出義務があるか誰でも判断できる必要がある）", async () => {
    for (const viewer of [YAMADA, SUZUKI, SATO, ADMIN]) {
      const holidays = rows(await as(viewer).from("company_holidays").select("*"));
      assert.ok(holidays.length > 0, `${viewer} が会社休日を見られない`);
    }
  });

  test("一般社員は会社休日を書き換えられない", async () => {
    const { error } = await as(YAMADA)
      .from("company_holidays")
      .insert({ holiday_on: "2026-12-31", label: "勝手に休む" });
    assert.ok(error, "一般社員の書き込みが通ってしまった");
  });
});

describe("シードの健全性", () => {
  test("行動指針は 5指針 × 6役職 = 30件", () => {
    assert.equal(buildSeed().behavior_guidelines.length, 30);
  });

  test("役職別ウェイトは常に合計1.0", () => {
    for (const row of buildSeed().job_grade_weights) {
      const sum = row.quantitative + row.behavioral + row.development;
      assert.ok(Math.abs(sum - 1) < 1e-9, `${row.job_grade} のウェイト合計が ${sum}`);
    }
  });

  test("組織が三段になっている（田中が山田の二次承認者）", () => {
    const profiles = buildSeed().profiles;
    const yamada = profiles.find((p) => p.id === YAMADA)!;
    const sato = profiles.find((p) => p.id === yamada.manager_id)!;
    assert.equal(sato.id, SATO);
    assert.equal(sato.manager_id, TANAKA);
  });
});
