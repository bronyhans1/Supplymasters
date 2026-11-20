"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";
import { recordFullPaymentSchema } from "./schemas";
import type { PaymentRow } from "./queries";

export type PaymentActionResult =
  | { ok: true; data: PaymentRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function mapPaymentError(error: { message?: string } | null): AppError {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("already marked paid") || message.includes("already exists")) {
    return new AppError(
      409,
      "PAYMENT_ALREADY_RECORDED",
      "This supply is already fully paid.",
    );
  }
  if (message.includes("not found")) {
    return new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found.");
  }
  if (message.includes("zero total")) {
    return new AppError(
      400,
      "INVALID_AMOUNT",
      "Cannot record payment for a supply with zero total.",
    );
  }
  if (message.includes("only staff") || message.includes("administrator")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only staff or administrators may record payments.",
    );
  }
  return new AppError(
    400,
    "PAYMENT_RECORD_FAILED",
    error?.message?.trim() || "The payment could not be recorded.",
  );
}

function failure(error: unknown): PaymentActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid payment details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "PAYMENT_RECORD_FAILED",
      message: "The payment could not be recorded.",
    },
  };
}

/**
 * Record full payment for an unpaid supply via record_full_payment RPC.
 * Independent of dispatch and delivery status. No partial payments.
 */
export async function recordFullPayment(
  input: unknown,
): Promise<PaymentActionResult> {
  try {
    await requireStaffOrAdmin();
    const parsed = recordFullPaymentSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("record_full_payment", {
      p_supply_id: parsed.supplyId,
      p_payment_method: parsed.paymentMethod,
      p_payment_date: parsed.paymentDate ?? null,
      p_transaction_reference: parsed.transactionReference,
      p_notes: parsed.notes,
    });

    if (error || !data) {
      throw mapPaymentError(error);
    }

    const payment = data as PaymentRow;
    revalidatePath("/app/payments");
    revalidatePath(`/app/payments/${payment.id}`);
    revalidatePath("/app/supplies");
    revalidatePath(`/app/supplies/${parsed.supplyId}`);

    return {
      ok: true,
      data: payment,
      message: `Payment ${payment.payment_ref} recorded for the full supply amount.`,
    };
  } catch (error) {
    return failure(error);
  }
}
