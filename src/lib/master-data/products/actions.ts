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
  productUpdateSchema,
  productWriteSchema,
  setProductActiveSchema,
} from "./schemas";
import type { ProductRow } from "./queries";

function revalidateProducts(id?: string) {
  revalidatePath("/app/products");
  if (id) revalidatePath(`/app/products/${id}`);
}

function productWriteFailureMessage(
  error: { message?: string; code?: string },
  fallback: string,
) {
  const message = error.message ?? "";
  if (message.includes("Inactive product categories cannot be assigned")) {
    return "Inactive product categories cannot be assigned to products.";
  }
  if (message.includes("Selected product category was not found")) {
    return "Selected product category was not found.";
  }
  if (error.code === "23503") {
    return "Selected product category was not found.";
  }
  return fallback;
}

export async function createProduct(
  input: unknown,
): Promise<MasterDataActionResult<ProductRow>> {
  try {
    await requireAdmin();
    const parsed = productWriteSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: parsed.name,
        brand: parsed.brand,
        category_id: parsed.category_id,
        packaging_size: parsed.packaging_size,
        unit_of_measure: parsed.unit_of_measure,
        is_active: parsed.is_active,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "PRODUCT_CREATE_FAILED",
        productWriteFailureMessage(error ?? {}, "Unable to create the product."),
      );
    }

    revalidateProducts(data.id);
    return {
      ok: true,
      data: data as ProductRow,
      message: `Product created (${data.product_code}).`,
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function updateProduct(
  input: unknown,
): Promise<MasterDataActionResult<ProductRow>> {
  try {
    await requireAdmin();
    const parsed = productUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .update({
        name: parsed.name,
        brand: parsed.brand,
        category_id: parsed.category_id,
        packaging_size: parsed.packaging_size,
        unit_of_measure: parsed.unit_of_measure,
        is_active: parsed.is_active,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "PRODUCT_UPDATE_FAILED",
        productWriteFailureMessage(error ?? {}, "Unable to update the product."),
      );
    }

    revalidateProducts(data.id);
    return { ok: true, data: data as ProductRow, message: "Product updated." };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function setProductActive(
  input: unknown,
): Promise<MasterDataActionResult<ProductRow>> {
  try {
    await requireAdmin();
    const parsed = setProductActiveSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .update({ is_active: parsed.isActive })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "PRODUCT_STATUS_FAILED",
        "Unable to change product status.",
      );
    }

    revalidateProducts(data.id);
    return {
      ok: true,
      data: data as ProductRow,
      message: data.is_active ? "Product activated." : "Product deactivated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}
