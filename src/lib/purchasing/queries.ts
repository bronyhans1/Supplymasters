import "server-only";

import { requireAdmin } from "@/lib/auth/session";
import { SEARCH_SCOPE_ID_LIMIT } from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listPurchasesQuerySchema, type ListPurchasesQuery } from "./schemas";

export const PURCHASES_PAGE_SIZE = 20;

export type PurchaseRow = Database["public"]["Tables"]["stock_purchases"]["Row"];
export type PurchaseItemRow =
  Database["public"]["Tables"]["stock_purchase_items"]["Row"];

export type PurchaseSupplierSummary = {
  id: string;
  name: string;
  supplier_code: string;
  contact_person: string | null;
  phone: string | null;
};

export type PurchaseListRow = PurchaseRow & {
  supplier: PurchaseSupplierSummary | null;
  item_count: number;
};

export type PurchaseItemDetail = PurchaseItemRow & {
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type PurchaseDetail = PurchaseRow & {
  supplier: PurchaseSupplierSummary | null;
  items: PurchaseItemDetail[];
};

export type ListPurchasesResult = {
  purchases: PurchaseListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListPurchasesQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listPurchases(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListPurchasesResult> {
  await requireAdmin();

  const parsed = listPurchasesQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    supplierId: typeof rawQuery.supplierId === "string" ? rawQuery.supplierId : "",
    fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
    toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * PURCHASES_PAGE_SIZE;
  const to = from + PURCHASES_PAGE_SIZE - 1;

  let query = supabase
    .from("stock_purchases")
    .select(
      `
      id,
      purchase_ref,
      supplier_id,
      purchase_date,
      supplier_invoice_ref,
      total_cost,
      recorded_by,
      created_at,
      supplier:stock_suppliers (
        id,
        name,
        supplier_code,
        contact_person,
        phone
      ),
      items:stock_purchase_items ( id )
    `,
      { count: "exact" },
    )
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.supplierId) {
    query = query.eq("supplier_id", parsed.supplierId);
  }
  if (parsed.fromDate) {
    query = query.gte("purchase_date", parsed.fromDate);
  }
  if (parsed.toDate) {
    query = query.lte("purchase_date", parsed.toDate);
  }

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    const { data: matchingSuppliers, error: supplierError } = await supabase
      .from("stock_suppliers")
      .select("id")
      .or(`name.ilike.${term},supplier_code.ilike.${term}`)
      .limit(SEARCH_SCOPE_ID_LIMIT);

    if (supplierError) {
      throw new AppError(500, "PURCHASE_LIST_FAILED", "Unable to load purchases.");
    }

    const supplierIds = (matchingSuppliers ?? []).map((row) => row.id);
    if (supplierIds.length > 0) {
      query = query.or(
        `purchase_ref.ilike.${term},supplier_id.in.(${supplierIds.join(",")})`,
      );
    } else {
      query = query.ilike("purchase_ref", term);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "PURCHASE_LIST_FAILED", "Unable to load purchases.");
  }

  const purchases: PurchaseListRow[] = (data ?? []).map((row) => {
    const { items, supplier, ...purchase } = row as PurchaseRow & {
      supplier: PurchaseSupplierSummary | PurchaseSupplierSummary[] | null;
      items: { id: string }[] | null;
    };
    const supplierValue = Array.isArray(supplier) ? supplier[0] ?? null : supplier;
    return {
      ...(purchase as PurchaseRow),
      supplier: supplierValue,
      item_count: items?.length ?? 0,
    };
  });

  return {
    purchases,
    total: count ?? 0,
    page: parsed.page,
    pageSize: PURCHASES_PAGE_SIZE,
    query: parsed,
  };
}

export async function getPurchase(purchaseId: string): Promise<PurchaseDetail> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_purchases")
    .select(
      `
      *,
      supplier:stock_suppliers (
        id,
        name,
        supplier_code,
        contact_person,
        phone
      ),
      items:stock_purchase_items (
        *,
        product:products (
          id,
          product_code,
          name,
          brand,
          packaging_size,
          unit_of_measure
        )
      )
    `,
    )
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "PURCHASE_LOOKUP_FAILED", "Unable to load that purchase.");
  }
  if (!data) {
    throw new AppError(404, "PURCHASE_NOT_FOUND", "Purchase not found.");
  }

  const row = data as PurchaseRow & {
    supplier: PurchaseSupplierSummary | PurchaseSupplierSummary[] | null;
    items: PurchaseItemDetail[] | null;
  };

  return {
    ...row,
    supplier: Array.isArray(row.supplier) ? row.supplier[0] ?? null : row.supplier,
    items: row.items ?? [],
  };
}

export async function listActiveSuppliersForPurchase(): Promise<
  PurchaseSupplierSummary[]
> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_suppliers")
    .select("id, name, supplier_code, contact_person, phone")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new AppError(500, "SUPPLIER_LIST_FAILED", "Unable to load stock suppliers.");
  }

  return (data ?? []) as PurchaseSupplierSummary[];
}
