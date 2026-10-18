import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildItemPatch } from "./term-form.ts";

/**
 * この関数が一度壊れて、**保存を押しただけで行動指針5項目のタイトルが全部消える**
 * という事故を起こした。一般職なら配点の8割を占める区分で、消えると
 * 「未記入の目標があります」で先へ進めなくなり、行動指針は削除もできないので
 * シートごと復旧不能になる。
 *
 * 原因は「フォームに送られてこなかった」と「空にされた」を区別していなかったこと。
 * 以下はその区別を固定するテスト。
 */

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
};

const ITEM = "item-1";

describe("期首の保存", () => {
  test("入力欄のある行はタイトルが書き換わる", () => {
    const patch = buildItemPatch({
      formData: form({ [`title_${ITEM}`]: "  月次原価報告を期限内に提出する  " }),
      itemId: ITEM,
      stage: "goal_setting",
      category: "quantitative",
    });
    assert.equal(patch.title, "月次原価報告を期限内に提出する");
  });

  test("入力欄の無い行（行動指針）はタイトルに触れない", () => {
    const patch = buildItemPatch({
      formData: form({ "title_other-item": "別の行の入力" }),
      itemId: ITEM,
      stage: "goal_setting",
      category: "behavioral",
    });
    assert.ok(!("title" in patch), "送られてこないタイトルを書き換えてはいけない");
    assert.deepEqual(patch, {}, "書くものが無いなら空のpatch");
  });

  test("本人が意図的に空にした場合は空で保存される", () => {
    const patch = buildItemPatch({
      formData: form({ [`title_${ITEM}`]: "" }),
      itemId: ITEM,
      stage: "goal_setting",
      category: "quantitative",
    });
    assert.equal(patch.title, "", "未送信と空欄は別物");
  });

  test("部門目標の紐付けは部門定量項目にだけ効く", () => {
    const fd = form({ [`department_goal_${ITEM}`]: "goal-1" });
    assert.equal(
      buildItemPatch({ formData: fd, itemId: ITEM, stage: "goal_setting", category: "quantitative" })
        .department_goal_id,
      "goal-1"
    );
    const behavioral = buildItemPatch({
      formData: fd,
      itemId: ITEM,
      stage: "goal_setting",
      category: "behavioral",
    });
    assert.ok(!("department_goal_id" in behavioral));
  });

  test("選べない部門目標を指してきたら未選択に倒す（保存自体は通す）", () => {
    const patch = buildItemPatch({
      formData: form({ [`department_goal_${ITEM}`]: "他部署の目標" }),
      itemId: ITEM,
      stage: "goal_setting",
      category: "quantitative",
      selectableGoalIds: new Set(["goal-1"]),
    });
    assert.equal(patch.department_goal_id, null);
  });
});

describe("中間・期末の保存", () => {
  test("中間で期首のタイトルを巻き込まない", () => {
    const patch = buildItemPatch({
      formData: form({ [`midterm_progress_${ITEM}`]: "8月・9月は期限内", [`midterm_self_score_${ITEM}`]: "4" }),
      itemId: ITEM,
      stage: "midterm",
    });
    assert.deepEqual(patch, { midterm_progress: "8月・9月は期限内", midterm_self_score: 4 });
    assert.ok(!("title" in patch));
  });

  test("期末で中間の記録を巻き込まない（上長が既に読んでいる可能性がある）", () => {
    const patch = buildItemPatch({
      formData: form({ [`self_comment_${ITEM}`]: "12回中10回を期限内に提出", [`self_score_${ITEM}`]: "4" }),
      itemId: ITEM,
      stage: "final",
    });
    assert.deepEqual(patch, { self_comment: "12回中10回を期限内に提出", self_score: 4 });
    assert.ok(!("midterm_progress" in patch));
  });

  test("未採点は null（0 でも 1 でもない）", () => {
    const patch = buildItemPatch({
      formData: form({ [`self_comment_${ITEM}`]: "記入のみ", [`self_score_${ITEM}`]: "" }),
      itemId: ITEM,
      stage: "final",
    });
    assert.equal(patch.self_score, null);
  });

  test("範囲外の点数は受け付けない", () => {
    for (const bad of ["0", "6", "3.5", "あ"]) {
      const patch = buildItemPatch({
        formData: form({ [`self_comment_${ITEM}`]: "x", [`self_score_${ITEM}`]: bad }),
        itemId: ITEM,
        stage: "final",
      });
      assert.equal(patch.self_score, null, `${bad} が通ってしまった`);
    }
  });
});
