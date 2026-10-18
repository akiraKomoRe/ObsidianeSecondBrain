import { cn } from "@/lib/utils";

/**
 * 1-5 grading control, matching the paper sheet's scale.
 *
 * Rendered as radios rather than a <select> so every option is a tap target on
 * a phone and the current mark is readable without opening anything -- these
 * screens get filled in on site.
 */
export function ScoreSelect({
  name,
  defaultValue,
  disabled = false,
  ariaLabel,
}: {
  name: string;
  defaultValue: number | null;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <fieldset className="flex items-center gap-1.5" disabled={disabled}>
      <legend className="sr-only">{ariaLabel}</legend>
      {[1, 2, 3, 4, 5].map((score) => (
        <label
          key={score}
          className={cn(
            "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
            "border-app-border text-app-text-muted hover:bg-app-card-hover",
            "has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <input
            type="radio"
            name={name}
            value={score}
            defaultChecked={defaultValue === score}
            className="sr-only"
          />
          <span className="tabular">{score}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Read-only equivalent, for stages where the viewer must not edit. */
export function ScoreDisplay({ score, label }: { score: number | null; label: string }) {
  return (
    <p className="flex items-baseline gap-1.5 text-sm">
      <span className="text-app-text-muted">{label}</span>
      <span className="tabular font-semibold text-app-text">
        {score ?? "—"}
        {score !== null ? <span className="font-normal text-app-text-faint"> / 5</span> : null}
      </span>
    </p>
  );
}
