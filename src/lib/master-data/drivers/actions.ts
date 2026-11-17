"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import {
  masterDataFailure,
  type MasterDataActionResult,
} from "@/lib/master-data/action-result";
import {
  driverUpdateSchema,
  driverWriteSchema,
  setDriverActiveSchema,
} from "./schemas";
import type { DriverRow } from "./queries";

function revalidateDrivers(id?: string) {
  revalidatePath("/app/drivers");
  if (id) revalidatePath(`/app/drivers/${id}`);
}

export async function createDriver(
  input: unknown,
): Promise<MasterDataActionResult<DriverRow>> {
  try {
    await requireAdmin();
    const parsed = driverWriteSchema.parse(input);
    const supabase = await createClient();

    // driver_code is assigned by the database trigger — never accept from the client.
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        full_name: parsed.full_name,
        phone: parsed.phone,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "DRIVER_CREATE_FAILED", "Unable to create the driver.");
    }

    revalidateDrivers(data.id);
    return {
      ok: true,
      data: data as DriverRow,
      message: `Driver created (${data.driver_code}).`,
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function updateDriver(
  input: unknown,
): Promise<MasterDataActionResult<DriverRow>> {
  try {
    await requireAdmin();
    const parsed = driverUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("drivers")
      .update({
        full_name: parsed.full_name,
        phone: parsed.phone,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "DRIVER_UPDATE_FAILED", "Unable to update the driver.");
    }

    revalidateDrivers(data.id);
    return { ok: true, data: data as DriverRow, message: "Driver updated." };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function setDriverActive(
  input: unknown,
): Promise<MasterDataActionResult<DriverRow>> {
  try {
    await requireAdmin();
    const parsed = setDriverActiveSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("drivers")
      .update({ is_active: parsed.isActive })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "DRIVER_STATUS_FAILED", "Unable to change driver status.");
    }

    revalidateDrivers(data.id);
    return {
      ok: true,
      data: data as DriverRow,
      message: data.is_active ? "Driver activated." : "Driver deactivated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}
