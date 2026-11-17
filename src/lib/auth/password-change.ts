import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError, toApiErrorBody } from "@/lib/utils/errors";
import { requireAuthForPasswordChange } from "@/lib/auth/session";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(NEW_PASSWORD_MIN_LENGTH)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});

export type PasswordChangeResult =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

/**
 * Trusted first-login / temporary password change workflow.
 *
 * 1. Caller must already be signed in with an active profile where must_change_password = true.
 * 2. Re-verify the current (temporary) password against Supabase Auth.
 * 3. Update the Auth password successfully.
 * 4. Only after Auth succeeds, clear profiles.must_change_password via
 *    service_clear_must_change_password using the secret-key admin client.
 * 5. If Auth update fails, leave must_change_password = true.
 */
export async function changeTemporaryPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordChangeResult> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(input);

    if (currentPassword === newPassword) {
      throw new AppError(
        400,
        "PASSWORD_UNCHANGED",
        "Choose a new password that differs from the temporary password.",
      );
    }

    const { profile } = await requireAuthForPasswordChange();
    const supabase = await createClient();

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (reauthError) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const lower = updateError.message.toLowerCase();
      if (
        lower.includes("weak") ||
        lower.includes("password") ||
        lower.includes("least")
      ) {
        throw new AppError(
          400,
          "PASSWORD_UPDATE_FAILED",
          `Unable to update password. Choose a stronger password of at least ${NEW_PASSWORD_MIN_LENGTH} characters with a letter and a number.`,
        );
      }
      throw new AppError(
        400,
        "PASSWORD_UPDATE_FAILED",
        "Unable to update password. Your temporary password requirement remains in effect.",
      );
    }

    const admin = createAdminClient();
    const { error: clearError } = await admin.rpc("service_clear_must_change_password", {
      p_user_id: profile.id,
    });

    if (clearError) {
      throw new AppError(
        500,
        "PASSWORD_FLAG_CLEAR_FAILED",
        "Password was updated, but account access could not be confirmed. Contact an administrator.",
      );
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, ...toApiErrorBody(error) };
    }

    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `New password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters and include a letter and a number.`,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "PASSWORD_CHANGE_ERROR",
        message: "Password change failed.",
      },
    };
  }
}
