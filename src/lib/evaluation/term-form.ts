import type { EvaluationCategory, TermEvaluationItem } from "@/types/database";

/**
 * 期末評価シートの1行分について、フォームから「実際に書き換える列」だけを取り出す。
 *
 * Server Action から切り出してあるのは、ここが一度壊れた場所だから。
 * 送られてこなかったフィールドを `?? ""` で拾うと、**入力欄を持たない行の値を
 * 空文字で上書きしてしまう**。行動指針の5項目は全社共通の文言なので入力欄が無く、
 * 以前はこれで「保存を押しただけでタイトルが5件とも消える」という壊れ方をしていた。
 * 一般職なら配点の8割を占める区分で、消えると「未記入の目標があります」で先へ
 * 進めなくなり、行動指針は削除もできないので復旧できない。
 *
 * したがって原則はひとつ: **`has()` で確かめてから書く。** 「送られてこなかった」と
 * 「空にされた」は別物として扱う。
 */

export type ItemPatch = Partial<TermEvaluationItem>;

function parseScore(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

/**
 * 部門目標の紐付け。
 *
 * `selectable` は本人が選べる部門目標のid集合。選べないはずのものを指してきたら
 * 未選択に倒す（保存自体を失敗させると、他の項目に書いた内容まで巻き添えで失われる）。
 */
function departmentGoalPatch(
  formData: FormData,
  itemId: string,
  category: EvaluationCategory | null,
  selectable: Set<string> | null
): ItemPatch {
  const key = `department_goal_${itemId}`;
  if (!formData.has(key)) return {};
  // 部門定量項目以外に部門目標はぶら下がらない（0006 の CHECK 制約と同じ条件）。
  if (category !== null && category !== "quantitative") return {};
  const raw = String(formData.get(key) ?? "").trim();
  if (raw && selectable && !selectable.has(raw)) return { department_goal_id: null };
  return { department_goal_id: raw || null };
}

/**
 * その段階で本人が触れる列だけを返す。段階を分けているのは、期末の自己評価を
 * 書いたときに、上長が既に読んだかもしれない中間の記録を巻き込んで消さないため。
 *
 * 空のオブジェクトが返るのは「この行には書くことが何も無い」という意味で、
 * 呼び出し側はUPDATEを投げずに飛ばす（0行更新は失敗と区別がつかない）。
 */
export function buildItemPatch({
  formData,
  itemId,
  stage,
  category = null,
  selectableGoalIds = null,
}: {
  formData: FormData;
  itemId: string;
  stage: string;
  category?: EvaluationCategory | null;
  selectableGoalIds?: Set<string> | null;
}): ItemPatch {
  if (stage === "goal_setting") {
    return {
      ...(formData.has(`title_${itemId}`)
        ? { title: String(formData.get(`title_${itemId}`) ?? "").trim() }
        : {}),
      // 紐付けが動くのは期首だけ。中間・期末で変えられると、何に向けて立てた
      // 目標だったのかが後から書き換わる。
      ...departmentGoalPatch(formData, itemId, category, selectableGoalIds),
    };
  }

  if (stage === "midterm") {
    if (!formData.has(`midterm_progress_${itemId}`)) return {};
    return {
      midterm_progress: String(formData.get(`midterm_progress_${itemId}`) ?? "").trim(),
      midterm_self_score: parseScore(formData.get(`midterm_self_score_${itemId}`)),
    };
  }

  if (!formData.has(`self_comment_${itemId}`)) return {};
  return {
    self_comment: String(formData.get(`self_comment_${itemId}`) ?? "").trim(),
    self_score: parseScore(formData.get(`self_score_${itemId}`)),
  };
}
