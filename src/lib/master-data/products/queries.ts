import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listProductsQuerySchema, type ListProductsQuery } from "./schemas";

export const PRODUCTS_PAGE_SIZE = 20;

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type ListProductsResult = {
  products: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListProductsQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listProducts(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListProductsResult> {
  await requireStaffOrAdmin();

  const parsed = listProductsQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    brand: typeof rawQuery.brand === "string" ? rawQuery.brand : "",
    category: typeof rawQuery.category === "string" ? rawQuery.category : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.status === "ACTIVE") query = query.eq("is_active", true);
  if (parsed.status === "INACTIVE") query = query.eq("is_active", false);
  if (parsed.brand) {
    query = query.ilike("brand", `%${sanitizeSearch(parsed.brand)}%`);
  }
  if (parsed.category) {
    query = query.ilike("category", `%${sanitizeSearch(parsed.category)}%`);
  }

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    query = query.or(`product_code.ilike.${term},name.ilike.${term}`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "PRODUCT_LIST_FAILED", "Unable to load products.");
  }

  return {
    products: (data ?? []) as ProductRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: PRODUCTS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getProduct(productId: string): Promise<ProductRow> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "PRODUCT_LOOKUP_FAILED", "Unable to load that product.");
  }
  if (!data) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  return data as ProductRow;
}
