import { AppError } from "@/lib/utils/errors";

/**
 * Authorization denials that should show Access Restricted (not a crash).
 * Client-safe — no Next.js navigation imports.
 */
export function isAuthorizationError(error: unknown): boolean {
  if (error instanceof AppError) {
    return (
      error.statusCode === 403 &&
      (error.code === "FORBIDDEN" ||
        error.code === "REPORTS_FORBIDDEN" ||
        error.code === "DASHBOARD_FORBIDDEN")
    );
  }

  if (error instanceof Error) {
    const message = error.message;
    return (
      message === "You do not have permission to perform this action." ||
      message.includes("do not have permission to view management reports") ||
      message.includes("do not have permission to view dashboard metrics")
    );
  }

  return false;
}
