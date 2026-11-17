"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  rethrowNextControlFlow,
  toApiErrorBody,
} from "@/lib/utils/errors";
import { mapDeliveryRpcError } from "./db-errors";
import {
  setDeliveryDriverSchema,
  setDeliveryResponsibleStaffSchema,
  updateDeliveryStatusSchema,
} from "./schemas";
import type { DeliveryRow } from "./queries";

export type DeliveryActionResult =
  | { ok: true; data: DeliveryRow; message: string }
  | { ok: false; error: { code: string; message: string } };

function failure(error: unknown): DeliveryActionResult {
  rethrowNextControlFlow(error);
  if (error instanceof AppError) {
    return { ok: false, ...toApiErrorBody(error) };
  }
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid delivery details.",
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "DELIVERY_UPDATE_FAILED",
      message: "The delivery could not be updated.",
    },
  };
}

function revalidateDeliveryPaths(delivery: DeliveryRow) {
  revalidatePath("/app/deliveries");
  revalidatePath(`/app/deliveries/${delivery.id}`);
  revalidatePath("/app/dispatch");
  revalidatePath(`/app/dispatch/${delivery.id}`);
  revalidatePath(`/app/supplies/${delivery.supply_id}`);
  revalidatePath("/app/supplies");
}

export async function assignDeliveryDriver(
  input: unknown,
): Promise<DeliveryActionResult> {
  try {
    await requireAdmin();
    const parsed = setDeliveryDriverSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("set_delivery_driver", {
      p_delivery_id: parsed.deliveryId,
      p_driver_id: parsed.driverId,
    });

    if (error || !data) {
      throw mapDeliveryRpcError(error, "Unable to update the delivery driver.");
    }

    const delivery = data as DeliveryRow;
    revalidateDeliveryPaths(delivery);

    return {
      ok: true,
      data: delivery,
      message: parsed.driverId
        ? "Driver assigned to this delivery."
        : "Driver cleared from this delivery.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function assignDeliveryResponsibleStaff(
  input: unknown,
): Promise<DeliveryActionResult> {
  try {
    await requireAdmin();
    const parsed = setDeliveryResponsibleStaffSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("set_delivery_responsible_staff", {
      p_delivery_id: parsed.deliveryId,
      p_staff_id: parsed.staffId,
    });

    if (error || !data) {
      throw mapDeliveryRpcError(
        error,
        "Unable to update responsible staff.",
      );
    }

    const delivery = data as DeliveryRow;
    revalidateDeliveryPaths(delivery);

    return {
      ok: true,
      data: delivery,
      message: "Responsible staff updated.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateDeliveryStatusAction(
  input: unknown,
): Promise<DeliveryActionResult> {
  try {
    await requireStaffOrAdmin();
    const parsed = updateDeliveryStatusSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("update_delivery_status", {
      p_delivery_id: parsed.deliveryId,
      p_to_status: parsed.toStatus,
      p_notes: parsed.notes,
    });

    if (error || !data) {
      throw mapDeliveryRpcError(error, "Unable to update delivery status.");
    }

    const delivery = data as DeliveryRow;
    revalidateDeliveryPaths(delivery);

    return {
      ok: true,
      data: delivery,
      message: `Delivery marked ${parsed.toStatus.toLowerCase()}.`,
    };
  } catch (error) {
    return failure(error);
  }
}
