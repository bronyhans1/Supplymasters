import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listVendorsQuerySchema, type ListVendorsQuery } from "./schemas";

export const VENDORS_PAGE_SIZE = 20;

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

export type ListVendorsResult = {
  vendors: VendorRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListVendorsQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listVendors(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListVendorsResult> {
  await requireStaffOrAdmin();

  const parsed = listVendorsQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * VENDORS_PAGE_SIZE;
  const to = from + VENDORS_PAGE_SIZE - 1;

  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.status === "ACTIVE") query = query.eq("is_active", true);
  if (parsed.status === "INACTIVE") query = query.eq("is_active", false);

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    query = query.or(
      `vendor_code.ilike.${term},business_name.ilike.${term},contact_person.ilike.${term},phone.ilike.${term},alt_phone.ilike.${term}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "VENDOR_LIST_FAILED", "Unable to load vendors.");
  }

  return {
    vendors: (data ?? []) as VendorRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: VENDORS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getVendor(vendorId: string): Promise<VendorRow> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "VENDOR_LOOKUP_FAILED", "Unable to load that vendor.");
  }
  if (!data) {
    throw new AppError(404, "VENDOR_NOT_FOUND", "Vendor not found.");
  }
  return data as VendorRow;
}
