import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listInventoryQuerySchema, type ListInventoryQuery } from "./schemas";
import {
  mapInventorySummaryRpc,
  type InventorySummary,
  type InventorySummaryRpcPayload,
  type InventoryUomTotal,
} from "./summary-rpc-types";

export type { InventorySummary, InventoryUomTotal };

export const INVENTORY_PAGE_SIZE = 20;
export const MOVEMENTS_PAGE_SIZE = 25;

export type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
export type StockMovementRow =
  Database["public"]["Tables"]["stock_movements"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type InventoryProductSummary = Pick<
  ProductRow,
  | "id"
  | "product_code"
  | "name"
  | "brand"
  | "category"
  | "packaging_size"
  | "unit_of_measure"
  | "is_active"
>;

export type InventoryListRow = InventoryProductSummary & {
  quantity_on_hand: number | null;
  inventory_updated_at: string | null;
  has_inventory_record: boolean;
};

export type ListInventoryResult = {
  rows: InventoryListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListInventoryQuery;
};

export type InventoryDetail = {
  product: ProductRow;
  inventory: InventoryRow | null;
  quantity_on_hand: number | null;
};

export type ListMovementsResult = {
  movements: StockMovementRow[];
  total: number;
  page: number;
  pageSize: number;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

/**
 * Inventory page summary via DB aggregation RPC.
 *
 * Before: products count head + full inventory row dump (+ UoM join), Node aggregation
 *   (PostgREST silently caps large selects ~1000 rows).
 * After (requires migration 20261114000100): 1 RPC returning scalars + totalsByUnit.
 * Dashboard zeroStockCount remains on get_dashboard_summary_data (unchanged).
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_inventory_summary_data");

  if (error) {
    const message = error.message ?? "";
    if (message.includes("INVENTORY_SUMMARY_FORBIDDEN")) {
      throw new AppError(
        403,
        "INVENTORY_SUMMARY_FORBIDDEN",
        "You do not have permission to view inventory summary.",
      );
    }
    if (
      message.includes("Could not find the function") ||
      message.includes("schema cache") ||
      error.code === "PGRST202"
    ) {
      throw new AppError(
        503,
        "INVENTORY_SUMMARY_MIGRATION_REQUIRED",
        "Inventory summary requires database migration 20261114000100_inventory_summary_db_aggregation. Apply it before using inventory summaries.",
      );
    }
    throw new AppError(
      500,
      "INVENTORY_SUMMARY_FAILED",
      "Unable to load inventory summary.",
    );
  }

  if (!data || typeof data !== "object") {
    throw new AppError(
      500,
      "INVENTORY_SUMMARY_FAILED",
      "Inventory summary returned an empty payload.",
    );
  }

  return mapInventorySummaryRpc(data as InventorySummaryRpcPayload);
}

export async function listInventory(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListInventoryResult> {
  await requireStaffOrAdmin();

  const parsed = listInventoryQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    category: typeof rawQuery.category === "string" ? rawQuery.category : "",
    stock: typeof rawQuery.stock === "string" ? rawQuery.stock : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * INVENTORY_PAGE_SIZE;
  const to = from + INVENTORY_PAGE_SIZE - 1;

  // ZERO = active products with qty 0 or missing inventory (left join).
  // IN_STOCK keeps an inner join so only products with positive on-hand appear.
  const joinHint =
    parsed.stock === "IN_STOCK" ? "inventory!inner" : "inventory";

  let query = supabase
    .from("products")
    .select(
      `
      id,
      product_code,
      name,
      brand,
      category,
      packaging_size,
      unit_of_measure,
      is_active,
      ${joinHint} (
        id, quantity_on_hand, updated_at
      )
    `,
      { count: "exact" },
    )
    .order("name", { ascending: true })
    .range(from, to);

  if (parsed.category) {
    query = query.ilike("category", `%${sanitizeSearch(parsed.category)}%`);
  }

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    query = query.or(`product_code.ilike.${term},name.ilike.${term}`);
  }

  if (parsed.stock === "IN_STOCK") {
    query = query.gt("inventory.quantity_on_hand", 0);
  } else if (parsed.stock === "ZERO") {
    query = query
      .eq("is_active", true)
      .or("quantity_on_hand.eq.0,id.is.null", { foreignTable: "inventory" });
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "INVENTORY_LIST_FAILED", "Unable to load inventory.");
  }

  const rows: InventoryListRow[] = (data ?? []).map((row) => {
    const inventoryValue = row.inventory as
      | { id: string; quantity_on_hand: number; updated_at: string }
      | { id: string; quantity_on_hand: number; updated_at: string }[]
      | null;
    const inventory = Array.isArray(inventoryValue)
      ? inventoryValue[0] ?? null
      : inventoryValue;

    return {
      id: row.id,
      product_code: row.product_code,
      name: row.name,
      brand: row.brand,
      category: row.category,
      packaging_size: row.packaging_size,
      unit_of_measure: row.unit_of_measure,
      is_active: row.is_active,
      quantity_on_hand: inventory ? inventory.quantity_on_hand : null,
      inventory_updated_at: inventory?.updated_at ?? null,
      has_inventory_record: Boolean(inventory),
    };
  });

  return {
    rows,
    total: count ?? 0,
    page: parsed.page,
    pageSize: INVENTORY_PAGE_SIZE,
    query: parsed,
  };
}

export async function getInventoryDetail(productId: string): Promise<InventoryDetail> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    throw new AppError(
      500,
      "INVENTORY_DETAIL_FAILED",
      "Unable to load inventory details.",
    );
  }
  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (inventoryError) {
    throw new AppError(
      500,
      "INVENTORY_DETAIL_FAILED",
      "Unable to load inventory details.",
    );
  }

  return {
    product: product as ProductRow,
    inventory: (inventory as InventoryRow | null) ?? null,
    quantity_on_hand: inventory ? inventory.quantity_on_hand : null,
  };
}

export async function listStockMovementsForProduct(
  productId: string,
  page = 1,
): Promise<ListMovementsResult> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * MOVEMENTS_PAGE_SIZE;
  const to = from + MOVEMENTS_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("stock_movements")
    .select("*", { count: "exact" })
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError(
      500,
      "STOCK_MOVEMENT_LIST_FAILED",
      "Unable to load stock movement history.",
    );
  }

  return {
    movements: (data ?? []) as StockMovementRow[],
    total: count ?? 0,
    page: safePage,
    pageSize: MOVEMENTS_PAGE_SIZE,
  };
}
