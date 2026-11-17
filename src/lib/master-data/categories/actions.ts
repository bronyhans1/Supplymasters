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
  categoryUpdateSchema,
  categoryWriteSchema,
  setCategoryActiveSchema,
} from "./schemas";
import type { ProductCategoryRow } from "./types";

function revalidateCategories(id?: string) {
  revalidatePath("/app/categories");
  revalidatePath("/app/products");
  if (id) revalidatePath(`/app/categories/${id}`);
}

function categoryWriteFailureMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "A category with that name already exists.";
  }
  return "Unable to save the product category.";
}

export async function createCategory(
  input: unknown,
): Promise<MasterDataActionResult<ProductCategoryRow>> {
  try {
    await requireAdmin();
    const parsed = categoryWriteSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        name: parsed.name,
        is_active: parsed.is_active,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "CATEGORY_CREATE_FAILED",
        categoryWriteFailureMessage(error ?? {}),
      );
    }

    revalidateCategories(data.id);
    return {
      ok: true,
      data: data as ProductCategoryRow,
      message: `Category created (${data.name}).`,
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function updateCategory(
  input: unknown,
): Promise<MasterDataActionResult<ProductCategoryRow>> {
  try {
    await requireAdmin();
    const parsed = categoryUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_categories")
      .update({
        name: parsed.name,
        is_active: parsed.is_active,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "CATEGORY_UPDATE_FAILED",
        categoryWriteFailureMessage(error ?? {}),
      );
    }

    revalidateCategories(data.id);
    return {
      ok: true,
      data: data as ProductCategoryRow,
      message: "Category updated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}

export async function setCategoryActive(
  input: unknown,
): Promise<MasterDataActionResult<ProductCategoryRow>> {
  try {
    await requireAdmin();
    const parsed = setCategoryActiveSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_categories")
      .update({ is_active: parsed.isActive })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        400,
        "CATEGORY_STATUS_FAILED",
        "Unable to change category status.",
      );
    }

    revalidateCategories(data.id);
    return {
      ok: true,
      data: data as ProductCategoryRow,
      message: data.is_active ? "Category activated." : "Category deactivated.",
    };
  } catch (error) {
    return masterDataFailure(error);
  }
}
