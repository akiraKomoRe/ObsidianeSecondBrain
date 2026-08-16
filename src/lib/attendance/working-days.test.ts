import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CalendarWorkingDaySource, weekdaysBetween } from "./working-days.ts";

/**
 * The bug this replaces: a person who took 有給 on Friday was shown "日報 4/5件"
 * and the AI evaluator was told the same, so a legitimate day off read as a
 * skipped report. These tests pin the fix — the denominator has to be the days
 * the person actually worked.
 */

type Row = Record<string, unknown>;

/** Stands in for the Supabase/local client, matching only the shape used. */
function fakeClient(tables: { company_holidays?: Row[]; personal_leaves?: Row[] }) {
  return {
    from(table: string) {
      const rows = (tables as Record<string, Row[] | undefined>)[table] ?? [];
      return {
        select() {
          return {
            gte(column: string, low: string) {
              return {
                async lte(_column: string, high: string) {
                  const within = rows.filter((row) => {
                    const value = String(row[column]);
                    return value >= low && value <= high;
                  });
                  return { data: within };
                },
              };
            },
          };
        },
      };
    },
  };
}

const ALICE = "alice";
const BOB = "bob";

// 2026-08-03(月) 〜 2026-08-09(日)。平日は 03,04,05,06,07 の5日。
const WEEK_START = "2026-08-03";
const WEEK_END = "2026-08-09";

describe("稼働日の算出", () => {
  test("土日は最初から数えない", () => {
    assert.deepEqual(weekdaysBetween(WEEK_START, WEEK_END), [
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  test("終了日が開始日より前なら0件（週の途中で今日に切り詰めた場合の端）", () => {
    assert.deepEqual(weekdaysBetween("2026-08-09", "2026-08-03"), []);
  });

  test("休日マスタが空でも壊れず、平日をそのまま返す", async () => {
    const source = new CalendarWorkingDaySource(fakeClient({}));
    const days = await source.listWorkingDays(ALICE, WEEK_START, WEEK_END);
    assert.equal(days.length, 5);
  });

  test("会社休日は全員の稼働日から外れる", async () => {
    const source = new CalendarWorkingDaySource(
      fakeClient({ company_holidays: [{ holiday_on: "2026-08-05", label: "創立記念日" }] })
    );
    const days = await source.listWorkingDays(ALICE, WEEK_START, WEEK_END);
    assert.equal(days.length, 4);
    assert.ok(!days.includes("2026-08-05"));
  });

  test("有給を取った日はその人の稼働日から外れる", async () => {
    const source = new CalendarWorkingDaySource(
      fakeClient({ personal_leaves: [{ user_id: ALICE, leave_on: "2026-08-07" }] })
    );
    const days = await source.listWorkingDays(ALICE, WEEK_START, WEEK_END);
    assert.equal(days.length, 4, "有給の金曜は分母に入らない");
    assert.ok(!days.includes("2026-08-07"));
  });

  test("他人の有給で自分の稼働日が減らない", async () => {
    const source = new CalendarWorkingDaySource(
      fakeClient({ personal_leaves: [{ user_id: BOB, leave_on: "2026-08-07" }] })
    );
    const days = await source.listWorkingDays(ALICE, WEEK_START, WEEK_END);
    assert.equal(days.length, 5);
  });

  test("会社休日と有給が重なっても二重に引かれない", async () => {
    const source = new CalendarWorkingDaySource(
      fakeClient({
        company_holidays: [{ holiday_on: "2026-08-05" }],
        personal_leaves: [{ user_id: ALICE, leave_on: "2026-08-05" }],
      })
    );
    const days = await source.listWorkingDays(ALICE, WEEK_START, WEEK_END);
    assert.equal(days.length, 4);
  });

  test("週の途中まで切り詰めても正しく数える（ダッシュボードの分母）", async () => {
    const source = new CalendarWorkingDaySource(
      fakeClient({ personal_leaves: [{ user_id: ALICE, leave_on: "2026-08-04" }] })
    );
    // 水曜時点。平日は 03,04,05 の3日、うち04は有給なので2日。
    const days = await source.listWorkingDays(ALICE, WEEK_START, "2026-08-05");
    assert.deepEqual(days, ["2026-08-03", "2026-08-05"]);
  });
});
