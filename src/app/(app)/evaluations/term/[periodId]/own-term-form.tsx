"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScoreDisplay, ScoreSelect } from "@/components/evaluation/score-select";
import { CATEGORY_LABELS, type EvaluationCategory } from "@/lib/evaluation/score";
import type { TermEvaluationView } from "@/lib/evaluation/get-term";
import {
  addTermItem,
  advanceStage,
  createTermEvaluation,
  deleteTermItem,
  saveOwnTermEvaluation,
  type TermFormState,
} from "../actions";

const initialState: TermFormState = { error: null, success: false };

function Feedback({ state }: { state: TermFormState }) {
  if (state.error) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-app-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        保存しました。
      </p>
    );
  }
  return null;
}

export function CreateSheetForm({ periodId }: { periodId: string }) {
  const [state, formAction, pending] = useActionState(createTermEvaluation, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="period_id" value={periodId} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "作成中..." : "評価シートを作成"}
      </Button>
    </form>
  );
}

function AddItemForm({ evaluationId, category }: { evaluationId: string; category: EvaluationCategory }) {
  const [state, formAction, pending] = useActionState(addTermItem, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <input type="hidden" name="category" value={category} />
      <Feedback state={state} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Plus className="h-3.5 w-3.5" />
        目標を追加
      </Button>
    </form>
  );
}

function DeleteItemForm({ itemId }: { itemId: string }) {
  const [, formAction, pending] = useActionState(deleteTermItem, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="item_id" value={itemId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="この目標を削除"
        className="text-app-text-faint hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}

function AdvanceStageForm({
  evaluationId,
  nextStage,
  label,
}: {
  evaluationId: string;
  nextStage: "midterm" | "final";
  label: string;
}) {
  const [state, formAction, pending] = useActionState(advanceStage, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <input type="hidden" name="next_stage" value={nextStage} />
      {state.error ? (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "処理中..." : label}
      </Button>
    </form>
  );
}

export function OwnTermSheetForm({ view }: { view: TermEvaluationView }) {
  const [state, formAction, pending] = useActionState(saveOwnTermEvaluation, initialState);
  const { evaluation, items, marksVisible } = view;
  const stage = evaluation.stage;

  // Once the sheet is with the approver, the employee's side is frozen. The
  // manager may already have graded against what was written.
  const locked = evaluation.status !== "draft";

  const grouped = (["quantitative", "behavioral", "development"] as const).map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="evaluation_id" value={evaluation.id} />
      <input type="hidden" name="stage" value={stage} />

      {locked ? (
        <p className="rounded-lg border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text-muted">
          承認プロセスに入っているため、この期の記入内容は編集できません。
        </p>
      ) : null}

      {grouped.map(({ category, items: categoryItems }) => (
        <Card key={category} className="gap-0 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-3.5">
            <h2 className="text-md font-semibold text-app-text">{CATEGORY_LABELS[category]}</h2>
            {!locked && stage === "goal_setting" && category !== "behavioral" ? (
              <AddItemForm evaluationId={evaluation.id} category={category} />
            ) : null}
          </div>

          {categoryItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-app-text-muted">
              {category === "behavioral"
                ? "行動指針が登録されていません。管理者にお問い合わせください。"
                : "「目標を追加」から期首の目標を登録してください。"}
            </p>
          ) : (
            <ul className="divide-y divide-app-border-soft">
              {categoryItems.map((item) => (
                <li key={item.id} className="space-y-3 px-5 py-4">
                  <input type="hidden" name="item_id" value={item.id} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {category === "behavioral" ? (
                        <>
                          <p className="font-medium text-app-text">{item.title}</p>
                          {item.expected_behavior ? (
                            <p className="text-sm text-app-text-muted">{item.expected_behavior}</p>
                          ) : null}
                        </>
                      ) : stage === "goal_setting" && !locked ? (
                        <>
                          <Label htmlFor={`title_${item.id}`}>期首目標</Label>
                          <Textarea
                            id={`title_${item.id}`}
                            name={`title_${item.id}`}
                            rows={2}
                            defaultValue={item.title}
                            placeholder="この期に達成する目標を記入してください"
                          />
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap font-medium text-app-text">
                          {item.title || "(未記入)"}
                        </p>
                      )}
                    </div>

                    {!locked && stage === "goal_setting" && category !== "behavioral" ? (
                      <DeleteItemForm itemId={item.id} />
                    ) : null}
                  </div>

                  {stage === "midterm" ? (
                    <div className="space-y-2">
                      <Label htmlFor={`midterm_progress_${item.id}`}>中間進捗</Label>
                      <Textarea
                        id={`midterm_progress_${item.id}`}
                        name={`midterm_progress_${item.id}`}
                        rows={3}
                        defaultValue={item.midterm_progress ?? ""}
                        disabled={locked}
                        placeholder="現時点での進捗と、その根拠を記入してください"
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-app-text-muted">自己採点</span>
                        <ScoreSelect
                          name={`midterm_self_score_${item.id}`}
                          defaultValue={item.midterm_self_score}
                          disabled={locked}
                          ariaLabel={`${item.title || "この目標"}の中間自己採点`}
                        />
                      </div>
                    </div>
                  ) : null}

                  {stage === "final" ? (
                    <>
                      {item.midterm_progress ? (
                        <div className="rounded-lg bg-app-card-hover px-3.5 py-2.5">
                          <p className="text-xs font-medium text-app-text-muted">中間進捗</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">
                            {item.midterm_progress}
                          </p>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label htmlFor={`self_comment_${item.id}`}>本人コメント</Label>
                        <Textarea
                          id={`self_comment_${item.id}`}
                          name={`self_comment_${item.id}`}
                          rows={3}
                          defaultValue={item.self_comment ?? ""}
                          disabled={locked}
                          placeholder="何をして、その結果どうだったかを記入してください"
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-app-text-muted">自己評価</span>
                          <ScoreSelect
                            name={`self_score_${item.id}`}
                            defaultValue={item.self_score}
                            disabled={locked}
                            ariaLabel={`${item.title || "この目標"}の自己評価`}
                          />
                        </div>
                      </div>
                    </>
                  ) : null}

                  {marksVisible && item.mark ? (
                    <div className="space-y-1.5 rounded-lg border border-app-border bg-app-surface px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="accent">上長評価</Badge>
                        <ScoreDisplay score={item.mark.manager_score} label="評点" />
                      </div>
                      {item.mark.manager_comment ? (
                        <p className="whitespace-pre-wrap text-sm text-app-text-muted">
                          {item.mark.manager_comment}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      {stage === "final" ? (
        <Card className="gap-2 p-5">
          <Label htmlFor="overall_self_comment">自己評価コメント（総括）</Label>
          <Textarea
            id="overall_self_comment"
            name="overall_self_comment"
            rows={4}
            defaultValue={evaluation.overall_self_comment ?? ""}
            disabled={locked}
            placeholder="【よかった点】&#10;【さらに成長するためのポイント】"
          />
          {marksVisible && evaluation.overall_manager_comment ? (
            <div className="mt-2 rounded-lg border border-app-border bg-app-surface px-3.5 py-3">
              <p className="text-xs font-medium text-app-text-muted">上長コメント</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">
                {evaluation.overall_manager_comment}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {!locked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </Button>
          {stage === "goal_setting" ? (
            <AdvanceStageForm
              evaluationId={evaluation.id}
              nextStage="midterm"
              label="目標を確定して中間進捗へ"
            />
          ) : null}
          {stage === "midterm" ? (
            <AdvanceStageForm
              evaluationId={evaluation.id}
              nextStage="final"
              label="最終評価の記入へ"
            />
          ) : null}
        </div>
      ) : null}

      <Feedback state={state} />
    </form>
  );
}
