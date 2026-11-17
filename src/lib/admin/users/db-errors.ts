import { AppError } from "@/lib/utils/errors";

/**
 * Map Postgres / RPC messages to safe operator-facing AppErrors.
 * Never echo raw secrets or credentials.
 */
export function mapAdminRpcError(error: { message?: string } | null | undefined): AppError {
  const message = error?.message?.trim() || "Administrative operation failed.";
  const lower = message.toLowerCase();

  if (
    lower.includes("last active administrator") ||
    lower.includes("last active admin")
  ) {
    return new AppError(
      409,
      "LAST_ADMIN_PROTECTED",
      "This change was rejected because it would leave the system without an active administrator.",
    );
  }

  if (lower.includes("only administrators may assign roles")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only administrators may change roles or activation.",
    );
  }

  if (lower.includes("only administrators")) {
    return new AppError(403, "FORBIDDEN", "Only administrators may perform this action.");
  }

  if (lower.includes("was not found")) {
    return new AppError(404, "USER_NOT_FOUND", "That user profile was not found.");
  }

  return new AppError(400, "ADMIN_RPC_FAILED", "The administrative operation could not be completed.");
}

export function isLastAdminProtectionMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("last active administrator") ||
    lower.includes("last active admin")
  );
}
