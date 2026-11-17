import "server-only";

import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listSuppliersQuerySchema, type ListSuppliersQuery } from "./schemas";

export const SUPPLIERS_PAGE_SIZE = 20;

export type SupplierRow = Database["public"]["Tables"]["stock_suppliers"]["Row"];

export type ListSuppliersResult = {
  suppliers: SupplierRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListSuppliersQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listSuppliers(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListSuppliersResult> {
  await requireAdmin();

  const parsed = listSuppliersQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * SUPPLIERS_PAGE_SIZE;
  const to = from + SUPPLIERS_PAGE_SIZE - 1;

  let query = supabase
    .from("stock_suppliers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.status === "ACTIVE") query = query.eq("is_active", true);
  if (parsed.status === "INACTIVE") query = query.eq("is_active", false);

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    query = query.or(
      `supplier_code.ilike.${term},name.ilike.${term},contact_person.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "SUPPLIER_LIST_FAILED", "Unable to load stock suppliers.");
  }

  return {
    suppliers: (data ?? []) as SupplierRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: SUPPLIERS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getSupplier(supplierId: string): Promise<SupplierRow> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_suppliers")
    .select("*")
    .eq("id", supplierId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "SUPPLIER_LOOKUP_FAILED",
      "Unable to load that stock supplier.",
    );
  }
  if (!data) {
    throw new AppError(404, "SUPPLIER_NOT_FOUND", "Stock supplier not found.");
  }
  return data as SupplierRow;
}
