"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  approveTermEvaluation,
  rejectTermEvaluation,
  type TermManagerState,
} from "@/app/(app)/team/term-actions";

const initialState: TermManagerState = { error: null, success: false };

export function ApprovalActions({
  evaluationId,
  memberId,
  periodId,
}: {
  evaluationId: string;
  memberId: string;
  periodId: string;
}) {
  const [approveState, approveAction, approving] = useActionState(approveTermEvaluation, initialState);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectTermEvaluation, initialState);
  const error = approveState.error ?? rejectState.error;

  return (
    <div className="space-y-2">
      {error ? (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/team/${memberId}/term/${periodId}`}>内容を確認する</Link>
        </Button>

        <form action={approveAction}>
          <input type="hidden" name="evaluation_id" value={evaluationId} />
          <Button type="submit" size="sm" disabled={approving || rejecting}>
            <Check className="h-3.5 w-3.5" />
            {approving ? "承認中..." : "承認する"}
          </Button>
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="evaluation_id" value={evaluationId} />
          <Button type="submit" variant="ghost" size="sm" disabled={approving || rejecting}>
            <Undo2 className="h-3.5 w-3.5" />
            {rejecting ? "差し戻し中..." : "上長へ差し戻す"}
          </Button>
        </form>
      </div>
    </div>
  );
}
