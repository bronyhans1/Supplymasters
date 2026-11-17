"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";
import { mapAdminRpcError } from "./db-errors";
import {
  createAuthUserForAdmin,
  waitForProvisionedProfile,
} from "./provision";
import {
  completeUserProvisioningSchema,
  createUserSchema,
  requirePasswordChangeSchema,
  setUserActiveSchema,
  setUserRoleSchema,
} from "./schemas";
import type { Profile } from "@/types/profile";

export type AdminUserActionResult =
  | {
      ok: true;
      user: Profile;
      message: string;
      /** True when Auth succeeded but role activation still needs recovery. */
      partial?: boolean;
    }
  | {
      ok: false;
      error: { code: string; message: string };
      /** Auth user id when create partially completed — use completeManagedUserProvisioning. */
      userId?: string;
      partial?: true;
    };

function failure(error: unknown, userId?: string): AdminUserActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return {
      ok: false,
      ...toApiErrorBody(error),
      ...(userId ? { userId, partial: true as const } : {}),
    };
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
      code: "ADMIN_ACTION_FAILED",
      message: "The administrative request could not be completed.",
    },
    ...(userId ? { userId, partial: true as const } : {}),
  };
}

async function assignRoleViaSession(
  userId: string,
  role: Profile["role"],
  isActive: boolean | null,
): Promise<Profile> {
  const session = await createClient();
  const { data, error } = await session.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
  });

  if (error || !data) {
    throw mapAdminRpcError(error);
  }

  return data as Profile;
}

/**
 * Create Auth user (Admin API) then assign role/activation via session RPC.
 * Never updates role/is_active/must_change_password via table UPDATE.
 */
export async function createManagedUser(input: unknown): Promise<AdminUserActionResult> {
  let createdUserId: string | undefined;

  try {
    await requireAdmin();
    const parsed = createUserSchema.parse(input);

    const { userId } = await createAuthUserForAdmin(parsed);
    createdUserId = userId;

    await waitForProvisionedProfile(userId);

    let user: Profile;
    try {
      user = await assignRoleViaSession(userId, parsed.role, true);
    } catch (roleError) {
      const mapped =
        roleError instanceof AppError
          ? roleError
          : new AppError(
              500,
              "ROLE_ASSIGNMENT_FAILED",
              "The Auth account was created as inactive STAFF, but role assignment failed. Open the user record to retry activation.",
            );

      return {
        ok: false,
        error: {
          code: mapped.code === "ADMIN_RPC_FAILED" ? "ROLE_ASSIGNMENT_FAILED" : mapped.code,
          message:
            mapped.code === "LAST_ADMIN_PROTECTED"
              ? mapped.message
              : "Account created but not fully activated. Open the user record and use Finish provisioning before delivering credentials. Temporary password was never logged.",
        },
        userId,
        partial: true,
      };
    }

    revalidatePath("/app/admin/users");
    revalidatePath(`/app/admin/users/${user.id}`);

    return {
      ok: true,
      user,
      message:
        "User created and activated. Deliver the temporary password out-of-band. They must change it on first sign-in.",
      partial: false,
    };
  } catch (error) {
    return failure(error, createdUserId);
  }
}

/**
 * Safe recovery after partial createManagedUser (Auth exists, role activation failed).
 * Does not create Auth users or touch temporary passwords.
 */
export async function completeManagedUserProvisioning(
  input: unknown,
): Promise<AdminUserActionResult> {
  try {
    await requireAdmin();
    const parsed = completeUserProvisioningSchema.parse(input);

    const current = await getProfileSnapshot(parsed.userId);
    if (current.is_active && current.role === parsed.role) {
      return {
        ok: true,
        user: current,
        message: "Provisioning already complete for this account.",
        partial: false,
      };
    }

    const user = await assignRoleViaSession(parsed.userId, parsed.role, true);

    revalidatePath("/app/admin/users");
    revalidatePath(`/app/admin/users/${parsed.userId}`);

    return {
      ok: true,
      user,
      message:
        "Provisioning completed. Deliver the temporary password out-of-band if it has not been delivered yet.",
      partial: false,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function changeManagedUserRole(input: unknown): Promise<AdminUserActionResult> {
  try {
    await requireAdmin();
    const parsed = setUserRoleSchema.parse(input);
    const user = await assignRoleViaSession(parsed.userId, parsed.role, null);

    revalidatePath("/app/admin/users");
    revalidatePath(`/app/admin/users/${parsed.userId}`);

    return {
      ok: true,
      user,
      message: `Role updated to ${user.role}.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function setManagedUserActive(input: unknown): Promise<AdminUserActionResult> {
  try {
    await requireAdmin();
    const parsed = setUserActiveSchema.parse(input);

    const current = await getProfileSnapshot(parsed.userId);
    const user = await assignRoleViaSession(
      parsed.userId,
      current.role,
      parsed.isActive,
    );

    revalidatePath("/app/admin/users");
    revalidatePath(`/app/admin/users/${parsed.userId}`);

    return {
      ok: true,
      user,
      message: user.is_active ? "Account activated." : "Account deactivated.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function requireManagedUserPasswordChange(
  input: unknown,
): Promise<AdminUserActionResult> {
  try {
    await requireAdmin();
    const parsed = requirePasswordChangeSchema.parse(input);

    const session = await createClient();
    const { data, error } = await session.rpc("admin_require_password_change", {
      p_user_id: parsed.userId,
    });

    if (error || !data) {
      throw mapAdminRpcError(error);
    }

    revalidatePath("/app/admin/users");
    revalidatePath(`/app/admin/users/${parsed.userId}`);

    return {
      ok: true,
      user: data as Profile,
      message: "Password change required on next sign-in.",
    };
  } catch (error) {
    return failure(error);
  }
}

async function getProfileSnapshot(userId: string): Promise<Profile> {
  const session = await createClient();
  const { data, error } = await session
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_active, must_change_password, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  return data as Profile;
}
