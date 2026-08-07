"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Eye, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScoreDisplay, ScoreSelect } from "@/components/evaluation/score-select";
import { CATEGORY_LABELS } from "@/lib/evaluation/score";
import type { TermEvaluationView } from "@/lib/evaluation/get-term";
import {
  discloseTermEvaluation,
  saveManagerMarks,
  submitForApproval,
  type TermManagerState,
} from "@/app/(app)/team/term-actions";

const initialState: TermManagerState = { error: null, success: false };

function Feedback({ state, successLabel }: { state: TermManagerState; successLabel: string }) {
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
        {successLabel}
      </p>
    );
  }
  return null;
}

function SubmitForApprovalForm({ evaluationId }: { evaluationId: string }) {
  const [state, formAction, pending] = useActionState(submitForApproval, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <Feedback state={state} successLabel="承認依頼を送りました。" />
      <Button type="submit" disabled={pending}>
        <Send className="h-4 w-4" />
        {pending ? "送信中..." : "二次承認者へ承認依頼"}
      </Button>
    </form>
  );
}

function DiscloseForm({ evaluationId }: { evaluationId: string }) {
  const [state, formAction, pending] = useActionState(discloseTermEvaluation, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <Feedback state={state} successLabel="本人に公開しました。" />
      <Button type="submit" disabled={pending}>
        <Eye className="h-4 w-4" />
        {pending ? "公開中..." : "面談済み・本人に公開する"}
      </Button>
      <p className="text-xs text-app-text-faint">
        公開するまで、本人は上長評価を閲覧できません。面談で説明したあとに押してください。
      </p>
    </form>
  );
}

export function ManagerTermForm({ view }: { view: TermEvaluationView }) {
  const [state, formAction, pending] = useActionState(saveManagerMarks, initialState);
  const { evaluation, items } = view;

  // Marks are frozen once the sheet is with the approver or signed off.
  const locked = evaluation.status !== "draft";

  const grouped = (["quantitative", "behavioral", "development"] as const).map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <div className="space-y-4">
      {evaluation.stage !== "final" ? (
        <p className="rounded-lg border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text-muted">
          本人がまだ最終評価の記入段階に入っていません（現在:{" "}
          {evaluation.stage === "goal_setting" ? "期首設定" : "中間進捗"}）。
          記入が終わるまで評価はお待ちください。
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="evaluation_id" value={evaluation.id} />

        {grouped.map(({ category, items: categoryItems }) => (
          <Card key={category} className="gap-0 py-0">
            <div className="border-b border-app-border px-5 py-3.5">
              <h2 className="text-md font-semibold text-app-text">{CATEGORY_LABELS[category]}</h2>
            </div>

            {categoryItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-app-text-muted">項目がありません。</p>
            ) : (
              <ul className="divide-y divide-app-border-soft">
                {categoryItems.map((item) => (
                  <li key={item.id} className="space-y-3 px-5 py-4">
                    <input type="hidden" name="item_id" value={item.id} />

                    <div>
                      <p className="whitespace-pre-wrap font-medium text-app-text">
                        {item.title || "(未記入)"}
                      </p>
                      {item.expected_behavior ? (
                        <p className="mt-1 text-sm text-app-text-muted">{item.expected_behavior}</p>
                      ) : null}
                    </div>

                    {item.midterm_progress ? (
                      <div className="rounded-lg bg-app-card-hover px-3.5 py-2.5">
                        <p className="text-xs font-medium text-app-text-muted">中間進捗</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">
                          {item.midterm_progress}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-app-border bg-app-surface px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">本人</Badge>
                        <ScoreDisplay score={item.self_score} label="自己評価" />
                      </div>
                      {item.self_comment ? (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-app-text-muted">
                          {item.self_comment}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`manager_comment_${item.id}`}>上長コメント</Label>
                      <Textarea
                        id={`manager_comment_${item.id}`}
                        name={`manager_comment_${item.id}`}
                        rows={3}
                        defaultValue={item.mark?.manager_comment ?? ""}
                        disabled={locked}
                        placeholder="事実に基づいた根拠を記入してください"
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-app-text-muted">上長評価</span>
                        <ScoreSelect
                          name={`manager_score_${item.id}`}
                          defaultValue={item.mark?.manager_score ?? null}
                          disabled={locked}
                          ariaLabel={`${item.title || "この目標"}の上長評価`}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        <Card className="gap-2 p-5">
          <Label htmlFor="overall_manager_comment">上長コメント（総括）</Label>
          <Textarea
            id="overall_manager_comment"
            name="overall_manager_comment"
            rows={4}
            defaultValue={evaluation.overall_manager_comment ?? ""}
            disabled={locked}
            placeholder="【よかった点】&#10;【さらに成長するためのポイント】"
          />
          {evaluation.overall_self_comment ? (
            <div className="mt-2 rounded-lg bg-app-card-hover px-3.5 py-3">
              <p className="text-xs font-medium text-app-text-muted">本人の自己評価コメント</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">
                {evaluation.overall_self_comment}
              </p>
            </div>
          ) : null}
        </Card>

        {!locked ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中..." : "評価を保存"}
            </Button>
            <Feedback state={state} successLabel="保存しました。" />
          </div>
        ) : null}
      </form>

      {evaluation.status === "draft" && evaluation.stage === "final" ? (
        <Card className="gap-2 p-5">
          <h2 className="text-md font-semibold text-app-text">承認依頼</h2>
          <p className="text-sm text-app-text-muted">
            すべての項目を評価してから、二次承認者へ依頼してください。
          </p>
          <SubmitForApprovalForm evaluationId={evaluation.id} />
        </Card>
      ) : null}

      {evaluation.status === "pending_approval" ? (
        <Card className="gap-1 p-5">
          <h2 className="text-md font-semibold text-app-text">承認待ち</h2>
          <p className="text-sm text-app-text-muted">
            二次承認者の承認をお待ちください。承認されるまで内容は編集できません。
          </p>
        </Card>
      ) : null}

      {evaluation.status === "approved" && !evaluation.disclosed_at ? (
        <Card className="gap-2 p-5">
          <h2 className="text-md font-semibold text-app-text">本人への公開</h2>
          <DiscloseForm evaluationId={evaluation.id} />
        </Card>
      ) : null}

      {evaluation.disclosed_at ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-app-success/30 bg-app-success-soft px-3.5 py-3 text-sm text-app-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          本人に公開済みです。
        </p>
      ) : null}
    </div>
  );
}
