"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      {state.error ? (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "ログイン中..." : "ログイン"}
        {!pending ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </form>
  );
}
