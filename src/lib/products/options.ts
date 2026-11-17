import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";

/** Cap for typeahead / filter product searches (avoids full-catalog dumps). */
export const PRODUCT_OPTION_SEARCH_LIMIT = 25;

export type ProductOption = {
  id: string;
  product_code: string;
  name: string;
  brand: string;
  packaging_size: string;
  unit_of_measure: string;
  /** Present when includeStock is true (supply flows). */
  quantity_on_hand?: number;
};

export type ProductFilterOption = {
  id: string;
  label: string;
};

type ProductSearchRow = {
  id: string;
  product_code: string;
  name: string;
  brand: string;
  packaging_size: string;
  unit_of_measure: string;
  inventory?:
    | { quantity_on_hand: number }
    | { quantity_on_hand: number }[]
    | null;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

function mapInventoryQuantity(
  inventoryValue:
    | { quantity_on_hand: number }
    | { quantity_on_hand: number }[]
    | null
    | undefined,
): number {
  const inventory = Array.isArray(inventoryValue)
    ? inventoryValue[0] ?? null
    : inventoryValue;
  return inventory?.quantity_on_hand ?? 0;
}

/**
 * Active-product typeahead for operational forms and filters.
 * Never returns the full catalogue — always limited.
 */
export async function searchActiveProductOptions(input: {
  q?: string;
  includeStock?: boolean;
  excludeIds?: string[];
  limit?: number;
}): Promise<ProductOption[]> {
  await requireStaffOrAdmin();

  const limit = Math.min(
    Math.max(1, input.limit ?? PRODUCT_OPTION_SEARCH_LIMIT),
    PRODUCT_OPTION_SEARCH_LIMIT,
  );
  const excludeIds = (input.excludeIds ?? []).filter(Boolean);
  const safe = sanitizeSearch(input.q ?? "");

  const supabase = await createClient();

  // Select string is intentionally untyped: generated Database types omit the
  // products → inventory reverse embed, same pattern as inventory list queries.
  const select = input.includeStock
    ? `
      id,
      product_code,
      name,
      brand,
      packaging_size,
      unit_of_measure,
      inventory ( quantity_on_hand )
    `
    : "id, product_code, name, brand, packaging_size, unit_of_measure";

  let query = supabase
    .from("products")
    .select(select as string)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (safe) {
    const term = `%${safe}%`;
    query = query.or(`product_code.ilike.${term},name.ilike.${term}`);
  }

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(500, "PRODUCT_LIST_FAILED", "Unable to search products.");
  }

  return ((data ?? []) as unknown as ProductSearchRow[]).map((row) => {
    const base: ProductOption = {
      id: row.id,
      product_code: row.product_code,
      name: row.name,
      brand: row.brand,
      packaging_size: row.packaging_size,
      unit_of_measure: row.unit_of_measure,
    };
    if (input.includeStock) {
      base.quantity_on_hand = mapInventoryQuantity(row.inventory);
    }
    return base;
  });
}

/** Resolve a single product for filter “selected” display (active or inactive). */
export async function resolveProductFilterOption(
  productId: string,
): Promise<ProductFilterOption | null> {
  await requireStaffOrAdmin();
  if (!productId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, product_code, name")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "PRODUCT_LOOKUP_FAILED", "Unable to load that product.");
  }
  if (!data) return null;

  return {
    id: data.id,
    label: `${data.product_code} · ${data.name}`,
  };
}

export async function countActiveProducts(): Promise<number> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    throw new AppError(500, "PRODUCT_LIST_FAILED", "Unable to load products.");
  }
  return count ?? 0;
}
