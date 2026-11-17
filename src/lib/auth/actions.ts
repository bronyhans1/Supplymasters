"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";
import {
  getCurrentProfile,
  getCurrentProfileFresh,
} from "@/lib/auth/session";
import { postSignInPath, roleHomePath } from "@/lib/auth/access";
import { changeTemporaryPassword } from "@/lib/auth/password-change";
import {
  passwordChangeFormSchema,
  signInCredentialsSchema,
} from "@/lib/auth/validation";

export type AuthActionResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

function failure(error: unknown): AuthActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return {
    ok: false,
    error: {
      code: "AUTH_ERROR",
      message: "Authentication request failed.",
    },
  };
}

/**
 * Email/password sign-in. No public registration.
 * Rejects inactive profiles. Allows sessions when must_change_password is true
 * so the mandatory password-change page can run.
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  try {
    const credentials = signInCredentialsSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      await supabase.auth.signOut();
      throw new AppError(
        403,
        "PROFILE_REQUIRED",
        "Your account could not be activated. Please contact an administrator.",
      );
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      throw new AppError(
        403,
        "ACCOUNT_INACTIVE",
        "This account is disabled. Contact an administrator.",
      );
    }

    return { ok: true, redirectTo: postSignInPath(profile) };
  } catch (error) {
    return failure(error);
  }
}

export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AppError(500, "SIGNOUT_FAILED", "Unable to sign out.");
    }

    return { ok: true, redirectTo: "/sign-in" };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Mandatory first-login password change.
 * Clears must_change_password only after Auth password update succeeds.
 */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  try {
    const parsed = passwordChangeFormSchema.parse(input);
    const result = await changeTemporaryPassword({
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
    });

    if (!result.ok) {
      return result;
    }

    // Bypass request-scoped profile cache: requireAuthForPasswordChange already
    // memoized must_change_password=true before the flag was cleared.
    const profile = await getCurrentProfileFresh();
    if (!profile || profile.must_change_password || !profile.is_active) {
      throw new AppError(
        500,
        "PASSWORD_FLAG_CLEAR_FAILED",
        "Password was updated, but account access could not be confirmed. Contact an administrator.",
      );
    }

    return { ok: true, redirectTo: roleHomePath(profile.role) };
  } catch (error) {
    return failure(error);
  }
}
