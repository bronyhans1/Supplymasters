"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changePasswordAction } from "@/lib/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { LoadingButton } from "@/components/ui/LoadingButton";
import {
  NEW_PASSWORD_MIN_LENGTH,
  passwordPolicyCopy,
} from "@/lib/auth/password-policy";

export function ChangePasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
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
    <form action={onSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent"
        >
          {error}
        </div>
      ) : null}

      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label="Temporary password"
        autoComplete="current-password"
      />
      <PasswordField
        id="newPassword"
        name="newPassword"
        label="New password"
        autoComplete="new-password"
        minLength={NEW_PASSWORD_MIN_LENGTH}
        helpText={passwordPolicyCopy.newPassword}
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        minLength={NEW_PASSWORD_MIN_LENGTH}
      />

      <p className="text-xs leading-5 text-muted">
        Your password must be changed before you can continue using SUPPLY MASTERS.
      </p>

      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Update password"
        pendingLabel="Updating password…"
        className="w-full"
      />
    </form>
  );
}
