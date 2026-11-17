import "server-only";

import { requireAdmin, requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import {
  listCategoriesQuerySchema,
  type ListCategoriesQuery,
} from "./schemas";
import type { CategorySelectOption, ProductCategoryRow } from "./types";

export type { CategorySelectOption, ProductCategoryRow } from "./types";

export const CATEGORIES_PAGE_SIZE = 20;

export type ListCategoriesResult = {
  categories: ProductCategoryRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListCategoriesQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listCategories(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListCategoriesResult> {
  await requireAdmin();

  const parsed = listCategoriesQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * CATEGORIES_PAGE_SIZE;
  const to = from + CATEGORIES_PAGE_SIZE - 1;

  let query = supabase
    .from("product_categories")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (parsed.status === "ACTIVE") query = query.eq("is_active", true);
  if (parsed.status === "INACTIVE") query = query.eq("is_active", false);

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    query = query.ilike("name", `%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(
      500,
      "CATEGORY_LIST_FAILED",
      "Unable to load product categories.",
    );
  }

  return {
    categories: (data ?? []) as ProductCategoryRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: CATEGORIES_PAGE_SIZE,
    query: parsed,
  };
}

export async function getCategory(categoryId: string): Promise<ProductCategoryRow> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "CATEGORY_LOOKUP_FAILED",
      "Unable to load that product category.",
    );
  }
  if (!data) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Product category not found.");
  }
  return data as ProductCategoryRow;
}

/**
 * Active categories for new product assignment, plus an optional current
 * inactive category so existing product records remain editable/visible.
 */
export async function listCategoriesForProductSelect(
  includeCategoryId?: string | null,
): Promise<CategorySelectOption[]> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data: active, error: activeError } = await supabase
    .from("product_categories")
    .select("id, name, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (activeError) {
    throw new AppError(
      500,
      "CATEGORY_OPTIONS_FAILED",
      "Unable to load product categories.",
    );
  }

  const options = new Map<string, CategorySelectOption>();
  for (const row of active ?? []) {
    options.set(row.id, {
      id: row.id,
      name: row.name,
      is_active: row.is_active,
    });
  }

  if (includeCategoryId && !options.has(includeCategoryId)) {
    const { data: current, error: currentError } = await supabase
      .from("product_categories")
      .select("id, name, is_active")
      .eq("id", includeCategoryId)
      .maybeSingle();

    if (currentError) {
      throw new AppError(
        500,
        "CATEGORY_OPTIONS_FAILED",
        "Unable to load product categories.",
      );
    }

    if (current) {
      options.set(current.id, {
        id: current.id,
        name: current.name,
        is_active: current.is_active,
      });
    }
  }

  return [...options.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
