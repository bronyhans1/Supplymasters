import { z } from "zod";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";

export type MasterDataActionResult<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: { code: string; message: string } };

export function masterDataFailure<T>(error: unknown): MasterDataActionResult<T> {
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
      code: "MASTER_DATA_FAILED",
      message: "The request could not be completed.",
    },
  };
}
