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
import { mapSupplyCreateError } from "./db-errors";
import { createSupplySchema } from "./schemas";
import type { SupplyRow } from "./queries";

export type SupplyActionResult =
  | { ok: true; data: SupplyRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function failure(error: unknown): SupplyActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid supply details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "SUPPLY_CREATE_FAILED",
      message: "The supply could not be completed.",
    },
  };
}

/**
 * Create a fully paid supply via create_supply_transaction.
 * Never writes inventory, stock_movements, payments, or supplies from app code.
 * clientRequestId makes retries/concurrent submits idempotent at the database.
 */
export async function createPaidSupply(
  input: unknown,
): Promise<SupplyActionResult> {
  try {
    await requireStaffOrAdmin();
    const parsed = createSupplySchema.parse(input);
    const supabase = await createClient();

    const itemsPayload = parsed.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { data, error } = await supabase.rpc("create_supply_transaction", {
      p_client_request_id: parsed.clientRequestId,
      p_vendor_id: parsed.vendorId,
      p_supply_date: parsed.supplyDate,
      p_items: itemsPayload,
      p_payment_method: parsed.paymentMethod,
      p_transaction_reference: parsed.transactionReference,
      p_notes: parsed.notes,
    });

    if (error || !data) {
      throw mapSupplyCreateError(error);
    }

    const supply = data as SupplyRow;
    revalidatePath("/app/supplies");
    revalidatePath(`/app/supplies/${supply.id}`);
    revalidatePath("/app/inventory");
    revalidatePath("/app/payments");
    revalidatePath("/app/deliveries");

    return {
      ok: true,
      data: supply,
      message: `Supply ${supply.supply_ref} recorded as paid. Stock has been deducted.`,
    };
  } catch (error) {
    return failure(error);
  }
}
