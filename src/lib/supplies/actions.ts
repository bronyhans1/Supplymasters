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
 * Create a supply with pending (UNPAID) payment obligation.
 * Stock is deducted; a deliveries row starts PENDING.
 * Payment is recorded later via record_full_payment — never here.
 */
export async function createSupply(
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
    revalidatePath("/app/dispatch");
    revalidatePath("/app/assignments");

    return {
      ok: true,
      data: supply,
      message: `Supply ${supply.supply_ref} created. Payment is pending. Stock has been deducted.`,
    };
  } catch (error) {
    return failure(error);
  }
}

/** @deprecated Prefer createSupply. Alias kept for Deploy package compatibility. */
export const createPaidSupply = createSupply;
