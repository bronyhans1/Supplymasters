"use server";

import { revalidatePath } from "next/cache";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import {
  masterDataFailure,
  type MasterDataActionResult,
} from "@/lib/master-data/action-result";
import {
  setVendorActiveSchema,
  vendorUpdateSchema,
  vendorWriteSchema,
} from "./schemas";
import type { VendorRow } from "./queries";

function revalidateVendors(id?: string) {
  revalidatePath("/app/vendors");
  if (id) revalidatePath(`/app/vendors/${id}`);
}

export async function createVendor(
  input: unknown,
): Promise<MasterDataActionResult<VendorRow>> {
  try {
    await requireStaffOrAdmin();
    const parsed = vendorWriteSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        business_name: parsed.business_name,
        contact_person: parsed.contact_person,
        phone: parsed.phone,
        alt_phone: parsed.alt_phone,
        location: parsed.location,
        digital_address: parsed.digital_address,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "VENDOR_CREATE_FAILED", "Unable to create the vendor.");
    }

    revalidateVendors(data.id);
    return {
      ok: true,
      data: data as VendorRow,
      message: `Vendor created (${data.vendor_code}).`,
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function updateVendor(
  input: unknown,
): Promise<MasterDataActionResult<VendorRow>> {
  try {
    await requireStaffOrAdmin();
    const parsed = vendorUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vendors")
      .update({
        business_name: parsed.business_name,
        contact_person: parsed.contact_person,
        phone: parsed.phone,
        alt_phone: parsed.alt_phone,
        location: parsed.location,
        digital_address: parsed.digital_address,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "VENDOR_UPDATE_FAILED", "Unable to update the vendor.");
    }

    revalidateVendors(data.id);
    return { ok: true, data: data as VendorRow, message: "Vendor updated." };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function setVendorActive(
  input: unknown,
): Promise<MasterDataActionResult<VendorRow>> {
  try {
    await requireStaffOrAdmin();
    const parsed = setVendorActiveSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vendors")
      .update({ is_active: parsed.isActive })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(400, "VENDOR_STATUS_FAILED", "Unable to change vendor status.");
    }

    revalidateVendors(data.id);
    return {
      ok: true,
      data: data as VendorRow,
      message: data.is_active ? "Vendor activated." : "Vendor deactivated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}
