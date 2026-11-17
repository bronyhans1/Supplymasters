"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { FILTER_SEARCH_LIMIT } from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";
import { mapReturnRpcError } from "./db-errors";
import {
  searchDeliveriesForReturnFilter,
  searchReturnableDeliveries,
  type DeliveryStockReturnRow,
  type ReturnableDeliveryOption,
  type ReturnDeliveryFilterOption,
} from "./queries";
import { recordDeliveryStockReturnSchema } from "./schemas";

export type ReturnActionResult =
  | { ok: true; data: DeliveryStockReturnRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function failure(error: unknown): ReturnActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid return details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "RETURN_RECORD_FAILED",
      message: "The stock return could not be recorded.",
    },
  };
}

/**
 * Record a physical stock return via record_delivery_stock_return.
 * Never writes delivery_stock_returns, return items, inventory, or stock_movements
 * from application code. The RPC restores stock atomically.
 *
 * clientRequestId makes retries/concurrent submits idempotent at the database.
 */
const deliverySearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  limit: z
    .number()
    .int()
    .min(1)
    .max(FILTER_SEARCH_LIMIT)
    .optional()
    .default(FILTER_SEARCH_LIMIT),
});

export type SearchReturnDeliveriesResult =
  | { ok: true; deliveries: ReturnDeliveryFilterOption[] }
  | { ok: false; error: string };

/** Client typeahead for return-list delivery filter. */
export async function searchReturnDeliveriesAction(
  input: unknown,
): Promise<SearchReturnDeliveriesResult> {
  try {
    const parsed = deliverySearchSchema.parse(input ?? {});
    const deliveries = await searchDeliveriesForReturnFilter(parsed);
    return { ok: true, deliveries };
  } catch (error) {
    rethrowNextControlFlow(error);
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Invalid search.",
      };
    }
    return { ok: false, error: "Unable to search deliveries." };
  }
}

export type SearchReturnableDeliveriesResult =
  | { ok: true; deliveries: ReturnableDeliveryOption[] }
  | { ok: false; error: string };

/** Client typeahead for FAILED/CANCELLED deliveries on return create. */
export async function searchReturnableDeliveriesAction(
  input: unknown,
): Promise<SearchReturnableDeliveriesResult> {
  try {
    const parsed = deliverySearchSchema.parse(input ?? {});
    const deliveries = await searchReturnableDeliveries(parsed);
    return { ok: true, deliveries };
  } catch (error) {
    rethrowNextControlFlow(error);
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Invalid search.",
      };
    }
    return { ok: false, error: "Unable to search returnable deliveries." };
  }
}

export async function recordDeliveryStockReturnAction(
  input: unknown,
): Promise<ReturnActionResult> {
  try {
    await requireStaffOrAdmin();
    const parsed = recordDeliveryStockReturnSchema.parse(input);
    const supabase = await createClient();

    const itemsPayload = parsed.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    }));

    const { data, error } = await supabase.rpc("record_delivery_stock_return", {
      p_client_request_id: parsed.clientRequestId,
      p_delivery_id: parsed.deliveryId,
      p_items: itemsPayload,
      p_notes: parsed.notes,
    });

    if (error || !data) {
      throw mapReturnRpcError(error);
    }

    const returnRow = data as DeliveryStockReturnRow;
    revalidatePath("/app/returns");
    revalidatePath(`/app/returns/${returnRow.id}`);
    revalidatePath(`/app/deliveries/${returnRow.delivery_id}`);
    revalidatePath("/app/deliveries");
    revalidatePath("/app/inventory");

    return {
      ok: true,
      data: returnRow,
      message: `Stock return ${returnRow.return_ref} recorded. Inventory was restored for the returned quantities.`,
    };
  } catch (error) {
    return failure(error);
  }
}
