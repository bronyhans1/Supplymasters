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
import { mapPurchaseReceiveError } from "./db-errors";
import { receivePurchaseSchema } from "./schemas";
import type { PurchaseRow } from "./queries";

export type PurchaseActionResult =
  | { ok: true; data: PurchaseRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function failure(error: unknown): PurchaseActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid purchase details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "PURCHASE_FAILED",
      message: "The purchase could not be completed.",
    },
  };
}

/**
 * Create and receive a stock purchase in one database transaction via
 * receive_stock_purchase. Never writes inventory or stock_movements from app code.
 * clientRequestId makes retries/concurrent submits idempotent at the database.
 */
export async function receivePurchase(input: unknown): Promise<PurchaseActionResult> {
  try {
    await requireAdmin();
    const parsed = receivePurchaseSchema.parse(input);
    const supabase = await createClient();

    const itemsPayload = parsed.items.map((item) => ({
      product_id: item.productId,
      quantity_boxes: item.quantity,
      unit_purchase_cost: item.unitCost,
    }));

    const { data, error } = await supabase.rpc("receive_stock_purchase", {
      p_client_request_id: parsed.clientRequestId,
      p_supplier_id: parsed.supplierId,
      p_purchase_date: parsed.purchaseDate,
      p_items: itemsPayload,
      p_supplier_invoice_ref: parsed.supplierInvoiceRef,
      p_notes: parsed.notes,
    });

    if (error || !data) {
      throw mapPurchaseReceiveError(error);
    }

    const purchase = data as PurchaseRow;
    revalidatePath("/app/purchasing");
    revalidatePath(`/app/purchasing/${purchase.id}`);
    revalidatePath("/app/inventory");

    return {
      ok: true,
      data: purchase,
      message: `Purchase ${purchase.purchase_ref} received. Inventory has been updated.`,
    };
  } catch (error) {
    return failure(error);
  }
}
