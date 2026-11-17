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
  setSupplierActiveSchema,
  supplierUpdateSchema,
  supplierWriteSchema,
} from "./schemas";
import type { SupplierRow } from "./queries";

function revalidateSuppliers(id?: string) {
  revalidatePath("/app/suppliers");
  if (id) revalidatePath(`/app/suppliers/${id}`);
}

export async function createSupplier(
  input: unknown,
): Promise<MasterDataActionResult<SupplierRow>> {
  try {
    await requireAdmin();
    const parsed = supplierWriteSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stock_suppliers")
      .insert({
        name: parsed.name,
        contact_person: parsed.contact_person,
        phone: parsed.phone,
        location: parsed.location,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "SUPPLIER_CREATE_FAILED",
        "Unable to create the stock supplier.",
      );
    }

    revalidateSuppliers(data.id);
    return {
      ok: true,
      data: data as SupplierRow,
      message: `Stock supplier created (${data.supplier_code}).`,
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function updateSupplier(
  input: unknown,
): Promise<MasterDataActionResult<SupplierRow>> {
  try {
    await requireAdmin();
    const parsed = supplierUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stock_suppliers")
      .update({
        name: parsed.name,
        contact_person: parsed.contact_person,
        phone: parsed.phone,
        location: parsed.location,
        notes: parsed.notes,
        is_active: parsed.is_active,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "SUPPLIER_UPDATE_FAILED",
        "Unable to update the stock supplier.",
      );
    }

    revalidateSuppliers(data.id);
    return {
      ok: true,
      data: data as SupplierRow,
      message: "Stock supplier updated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function setSupplierActive(
  input: unknown,
): Promise<MasterDataActionResult<SupplierRow>> {
  try {
    await requireAdmin();
    const parsed = setSupplierActiveSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stock_suppliers")
      .update({ is_active: parsed.isActive })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "SUPPLIER_STATUS_FAILED",
        "Unable to change stock supplier status.",
      );
    }

    revalidateSuppliers(data.id);
    return {
      ok: true,
      data: data as SupplierRow,
      message: data.is_active
        ? "Stock supplier activated."
        : "Stock supplier deactivated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}
