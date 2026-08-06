import type { ElementType, ReactNode } from "react";

export function Card({
  as,
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const Component = as ?? "div";
  return (
    <Component className={`rounded-2xl border border-app-border bg-app-card ${className}`}>
      {children}
    </Component>
  );
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
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-app-text">{title}</h2>
        {count !== undefined ? <span className="text-xs text-app-text-faint">{count}</span> : null}
      </div>
      {right}
    </div>
  );
}
