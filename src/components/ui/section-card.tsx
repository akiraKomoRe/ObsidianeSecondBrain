import type { ReactNode } from "react";

import { Card as ShadcnCard, CardHeader as ShadcnCardHeader, CardTitle } from "@/components/ui/card";

// Thin app-specific convenience wrapper around the shadcn Card primitives,
// used for the "section with a title/count header and a list body" pattern
// repeated across the daily/weekly/evaluations/team screens.
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <ShadcnCard className={`gap-0 py-0 ${className}`}>{children}</ShadcnCard>;
}

export function CardHeader({
  title,
  count,
  right,
}: {
  title: string;
  count?: number;
  right?: ReactNode;
}) {
  return (
    <ShadcnCardHeader className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-baseline gap-2">
        <CardTitle className="text-sm font-semibold text-app-text">{title}</CardTitle>
        {count !== undefined ? <span className="text-xs text-app-text-faint">{count}</span> : null}
      </div>
      {right}
    </ShadcnCardHeader>
  );
}
