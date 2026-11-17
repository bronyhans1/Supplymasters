"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signInWithPassword } from "@/lib/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { formControlPaperClass } from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { cn } from "@/lib/utils/cn";

export function SignInForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);

  function onSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent/30 bg-accent/5 px-3.5 py-2.5 text-sm text-accent"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={cn(
            formControlPaperClass,
            "px-3.5 transition placeholder:text-muted/70",
          )}
          placeholder="fitting@company.com"
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
      />

      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Sign in"
        pendingLabel="Signing in…"
        className="mt-1 w-full py-3 text-[0.95rem] font-semibold"
      />

      <p className="text-center text-xs leading-5 text-muted">
        Access is provided by your administrator. Public registration is not available.
      </p>
    </form>
  );
}
