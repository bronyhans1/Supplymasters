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
import { mapInventoryAdjustError } from "./db-errors";
import { adjustInventorySchema } from "./schemas";
import type { StockMovementRow } from "./queries";

export type InventoryActionResult =
  | { ok: true; data: StockMovementRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function failure(error: unknown): InventoryActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid adjustment details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "INVENTORY_ADJUST_FAILED",
      message: "The stock adjustment could not be completed.",
    },
  };
}

/**
 * Apply a manual stock adjustment via adjust_inventory.
 * Never updates inventory or inserts stock_movements from application code.
 *
 * Idempotency: clientRequestId is unique per intentional adjustment. Replays of
 * the same id with the same payload return the original movement without
 * changing stock again. Different payload with a reused id returns a conflict.
 */
export async function adjustInventoryStock(
  input: unknown,
): Promise<InventoryActionResult> {
  try {
    await requireStaffOrAdmin();
    const parsed = adjustInventorySchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_client_request_id: parsed.clientRequestId,
      p_product_id: parsed.productId,
      p_quantity_delta: parsed.quantityDelta,
      p_reason: parsed.reason,
    });

    if (error || !data) {
      throw mapInventoryAdjustError(error);
    }

    const movement = data as StockMovementRow;
    revalidatePath("/app/inventory");
    revalidatePath(`/app/inventory/${parsed.productId}`);

    const direction =
      parsed.quantityDelta > 0 ? "increased" : "decreased";
    return {
      ok: true,
      data: movement,
      message: `Stock ${direction} by ${Math.abs(parsed.quantityDelta)}. New balance: ${movement.quantity_after}.`,
    };
  } catch (error) {
    return failure(error);
  }
}
