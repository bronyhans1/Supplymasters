import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import type { Profile } from "@/types/profile";
import type { CreateUserInput } from "./schemas";

const PROFILE_POLL_ATTEMPTS = 8;
const PROFILE_POLL_DELAY_MS = 150;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isEmailExistsMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("email_exists")
  );
}

/**
 * Creates an Auth user via the server-only Admin API.
 * Does not assign roles — handle_new_user creates inactive STAFF.
 * Never logs the temporary password.
 */
export async function createAuthUserForAdmin(input: CreateUserInput): Promise<{
  userId: string;
}> {
  const admin = createAdminClient();
  const metadata: Record<string, string> = {
    full_name: input.fullName,
  };
  if (input.phone) {
    metadata.phone = input.phone;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    if (isEmailExistsMessage(error.message)) {
      throw new AppError(
        409,
        "EMAIL_EXISTS",
        "This email address is already associated with an account.",
      );
    }
    const lower = error.message.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("weak") ||
      lower.includes("least")
    ) {
      throw new AppError(
        400,
        "TEMP_PASSWORD_REJECTED",
        "The temporary password does not meet the password requirements.",
      );
    }
    throw new AppError(
      400,
      "AUTH_CREATE_FAILED",
      "Unable to create the account. Please try again or contact support.",
    );
  }

  if (!data.user?.id) {
    throw new AppError(
      500,
      "AUTH_CREATE_FAILED",
      "Unable to create the authentication account.",
    );
  }

  return { userId: data.user.id };
}

/**
 * Waits for handle_new_user to create the profile (inactive STAFF).
 */
export async function waitForProvisionedProfile(userId: string): Promise<Profile> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < PROFILE_POLL_ATTEMPTS; attempt += 1) {
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, email, full_name, phone, role, is_active, must_change_password, created_at, updated_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(
        500,
        "PROFILE_LOOKUP_FAILED",
        "The Auth account was created, but the profile could not be verified.",
      );
    }

    if (data) {
      if (
        data.role !== "STAFF" ||
        data.is_active !== false ||
        data.must_change_password !== true
      ) {
        throw new AppError(
          500,
          "UNEXPECTED_PROFILE_STATE",
          "The account was created, but it is not in the expected inactive starter state. Role assignment was not attempted. Open the user record to review.",
        );
      }
      return data as Profile;
    }

    if (attempt < PROFILE_POLL_ATTEMPTS - 1) {
      await sleep(PROFILE_POLL_DELAY_MS);
    }
  }

  throw new AppError(
    500,
    "PROFILE_MISSING",
    "The sign-in account was created, but the application profile did not appear. " +
      "The account was left inactive. Open the user record or contact support to finish setup.",
  );
}
