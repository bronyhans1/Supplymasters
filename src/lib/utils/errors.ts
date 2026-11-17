import { unstable_rethrow } from "next/navigation";
import type { ApiErrorBody } from "@/types/api";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function toApiErrorBody(error: AppError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

/**
 * Re-throw Next.js control-flow errors (forbidden/redirect/notFound) so
 * action catch blocks do not swallow them as generic failures.
 */
export function rethrowNextControlFlow(error: unknown): void {
  unstable_rethrow(error);
}
