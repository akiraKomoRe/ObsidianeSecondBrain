import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTermScore,
  JOB_GRADE_WEIGHTS,
  type EvaluationItem,
} from "./score.ts";

// These expectations are lifted from a real filled-in sheet (経営企画室, 2026 H1)
// rather than invented, so they pin the port to what managers already see. The
// Excel cells being matched are noted per assertion. The trailing float noise
// (8.000000000000002 and friends) is Excel's own and is deliberately asserted —
// if our arithmetic ever reassociates, these are what catch it.
const ippan = JOB_GRADE_WEIGHTS.ippan; // 定量0.1 / 行動0.8 / 育成0.1

// [category, 中間自己採点(G列), 自己評価(I列)]
const SHEET_ROWS: Array<[EvaluationItem["category"], number, number]> = [
  ["quantitative", 3, 4],
  ["quantitative", 3, 3],
  ["quantitative", 3, 3],
  ["behavioral", 3, 4],
  ["behavioral", 3, 4],
  ["behavioral", 3, 4],
  ["behavioral", 3, 4],
  ["behavioral", 3, 3],
  ["development", 4, 3],
  ["development", 4, 4],
];

function itemsFrom(column: "midterm" | "self"): EvaluationItem[] {
  return SHEET_ROWS.map(([category, midterm, selfEval]) => ({
    category,
    selfScore: column === "midterm" ? midterm : selfEval,
    managerScore: null,
    finalScore: null,
  }));
}

test("中間自己採点が実シートと一致する", () => {
  const score = calculateTermScore(itemsFrom("midterm"), ippan, "self");
  assert.equal(score.categories[0].points, 6); // G13
  assert.equal(score.categories[1].points, 48); // G20
  assert.equal(score.categories[2].points, 8.000000000000002); // G24
  assert.equal(score.total, 62); // G27
});

test("自己評価が実シートと一致する", () => {
  const score = calculateTermScore(itemsFrom("self"), ippan, "self");
  assert.equal(score.categories[0].points, 6.666666666666667); // I13
  assert.equal(score.categories[1].points, 60.80000000000001); // I20
  assert.equal(score.categories[2].points, 6.999999999999999); // I24
  assert.equal(score.total, 74.46666666666668); // I27
});

test("未採点の目標は0点ではなく分母から外れる（ExcelのCOUNTA挙動）", () => {
  const score = calculateTermScore(
    [
      { category: "behavioral", selfScore: 5, managerScore: null, finalScore: null },
      { category: "behavioral", selfScore: null, managerScore: null, finalScore: null },
    ],
    { quantitative: 0, behavioral: 1, development: 0 },
    "self"
  );
  // 1件だけ満点なら、残り1件が未記入でも満点。0点扱いなら50点になってしまう。
  assert.equal(score.total, 100);
  assert.equal(score.complete, false);
});

test("全役職で満点なら100点になる", () => {
  for (const [grade, weights] of Object.entries(JOB_GRADE_WEIGHTS)) {
    const score = calculateTermScore(
      [
        { category: "quantitative", selfScore: 5, managerScore: null, finalScore: null },
        { category: "behavioral", selfScore: 5, managerScore: null, finalScore: null },
        { category: "development", selfScore: 5, managerScore: null, finalScore: null },
      ],
      weights,
      "self"
    );
    assert.ok(Math.abs(score.total - 100) < 1e-9, `${grade}: ${score.total}`);
  }
});

test("取締役は定量ウェイト0なので定量項目は総点に効かない", () => {
  const items: EvaluationItem[] = [
    { category: "quantitative", selfScore: 1, managerScore: null, finalScore: null },
    { category: "behavioral", selfScore: 5, managerScore: null, finalScore: null },
    { category: "development", selfScore: 5, managerScore: null, finalScore: null },
  ];
  const score = calculateTermScore(items, JOB_GRADE_WEIGHTS.director, "self");
  assert.equal(score.categories[0].points, 0);
  assert.ok(Math.abs(score.total - 100) < 1e-9);
});

test("採点列を切り替えても独立して集計される", () => {
  const items: EvaluationItem[] = [
    { category: "behavioral", selfScore: 5, managerScore: 3, finalScore: null },
  ];
  const weights = { quantitative: 0, behavioral: 1, development: 0 };
  assert.equal(calculateTermScore(items, weights, "self").total, 100);
  assert.equal(calculateTermScore(items, weights, "manager").total, 60);
  assert.equal(calculateTermScore(items, weights, "final").total, 0);
});

test("未採点の目標がundefinedでも合計がNaNにならない", () => {
  // 期首設定の直後は self_score が一度も書かれていない。Postgres なら null が
  // 返るが、経路によっては undefined で届く。`!== null` で弾いていた時期に
  // 画面が「NaN / 100」になった実際の不具合の回帰テスト。
  const items = [
    { category: "quantitative", selfScore: undefined, managerScore: null, finalScore: null },
    { category: "behavioral", selfScore: undefined, managerScore: null, finalScore: null },
  ] as unknown as EvaluationItem[];

  const score = calculateTermScore(items, JOB_GRADE_WEIGHTS.ippan, "self");

  assert.equal(score.total, 0);
  assert.ok(score.categories.every((c) => Number.isFinite(c.points)));
  assert.equal(score.categories[0].scoredCount, 0, "未採点なのに採点済みと数えている");
  assert.equal(score.complete, false);
});

test("採点済みと未採点が混在しても採点済みだけで按分される", () => {
  const items = [
    { category: "behavioral", selfScore: 5, managerScore: null, finalScore: null },
    { category: "behavioral", selfScore: undefined, managerScore: null, finalScore: null },
  ] as unknown as EvaluationItem[];

  const score = calculateTermScore(items, { quantitative: 0, behavioral: 1, development: 0 }, "self");

  // 採点済み1件が満点なので満点。未採点は分母から外れる（ExcelのCOUNTA挙動）。
  assert.equal(score.total, 100);
  assert.equal(score.categories[1].scoredCount, 1);
  assert.equal(score.categories[1].itemCount, 2);
});
