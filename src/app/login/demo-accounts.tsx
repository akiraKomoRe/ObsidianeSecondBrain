"use client";

import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/local/seed";

/**
 * Only rendered in local mode. The half-year workflow needs three different
 * people (本人 → 上長 → 二次承認者), so switching accounts is not a nicety
 * here -- without it most of the app cannot be reached at all.
 *
 * Clicking a row fills the form rather than logging straight in, so what is
 * being submitted stays visible.
 */
export function DemoAccounts() {
  function fill(email: string) {
    const form = document.querySelector<HTMLFormElement>("form");
    const emailInput = form?.querySelector<HTMLInputElement>("#email");
    const passwordInput = form?.querySelector<HTMLInputElement>("#password");
    if (!emailInput || !passwordInput) return;
    // Assigning .value directly leaves React's tracked value stale, so the
    // change would be discarded on the next render. Go through the setter.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    for (const [input, value] of [
      [emailInput, email],
      [passwordInput, DEMO_PASSWORD],
    ] as const) {
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    emailInput.focus();
  }

  return (
    <div className="mt-8 rounded-lg border border-app-border bg-app-card p-4">
      <p className="text-xs font-semibold text-app-text-muted">
        ローカルモード（データベース未接続）
      </p>
      <p className="mt-1 text-xs text-app-text-faint">
        下の行を押すと入力欄が埋まります。パスワードは全員 <code>{DEMO_PASSWORD}</code> です。
      </p>
      <ul className="mt-3 space-y-1">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => fill(account.email)}
              className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-app-card-hover"
            >
              <span className="font-medium text-app-text">{account.name}</span>
              <span className="text-xs text-app-text-muted">{account.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
