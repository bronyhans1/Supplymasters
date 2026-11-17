import "server-only";

import { requireAdmin, requireStaffOrAdmin } from "@/lib/auth/session";
import { FILTER_SEARCH_LIMIT } from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";

export type PartnerFilterOption = {
  id: string;
  label: string;
};

export type VendorOption = {
  id: string;
  vendor_code: string;
  business_name: string;
  contact_person: string;
  phone: string;
  location: string;
  is_active: boolean;
};

export type SupplierOption = {
  id: string;
  name: string;
  supplier_code: string;
  contact_person: string | null;
  phone: string | null;
  is_active: boolean;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

function clampLimit(limit?: number): number {
  return Math.min(Math.max(1, limit ?? FILTER_SEARCH_LIMIT), FILTER_SEARCH_LIMIT);
}

/** Active-vendor typeahead for supply create/filter. */
export async function searchActiveVendorOptions(input: {
  q?: string;
  limit?: number;
}): Promise<VendorOption[]> {
  await requireStaffOrAdmin();
  const limit = clampLimit(input.limit);
  const safe = sanitizeSearch(input.q ?? "");
  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select(
      "id, vendor_code, business_name, contact_person, phone, location, is_active",
    )
    .eq("is_active", true)
    .order("business_name", { ascending: true })
    .limit(limit);

  if (safe) {
    const term = `%${safe}%`;
    query = query.or(
      `business_name.ilike.${term},vendor_code.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(500, "VENDOR_LIST_FAILED", "Unable to search vendors.");
  }
  return (data ?? []) as VendorOption[];
}

/** Resolve a vendor for filter/create selected display (active or inactive). */
export async function resolveVendorFilterOption(
  vendorId: string,
): Promise<PartnerFilterOption | null> {
  await requireStaffOrAdmin();
  if (!vendorId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, business_name, is_active")
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "VENDOR_LOOKUP_FAILED", "Unable to load that vendor.");
  }
  if (!data) return null;

  const inactive = data.is_active ? "" : " (inactive)";
  return {
    id: data.id,
    label: `${data.business_name} · ${data.vendor_code}${inactive}`,
  };
}

export async function countActiveVendors(): Promise<number> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) {
    throw new AppError(500, "VENDOR_LIST_FAILED", "Unable to load vendors.");
  }
  return count ?? 0;
}

/** Active-supplier typeahead for purchase create/filter (ADMIN). */
export async function searchActiveSupplierOptions(input: {
  q?: string;
  limit?: number;
}): Promise<SupplierOption[]> {
  await requireAdmin();
  const limit = clampLimit(input.limit);
  const safe = sanitizeSearch(input.q ?? "");
  const supabase = await createClient();

  let query = supabase
    .from("stock_suppliers")
    .select("id, name, supplier_code, contact_person, phone, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (safe) {
    const term = `%${safe}%`;
    query = query.or(`name.ilike.${term},supplier_code.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(500, "SUPPLIER_LIST_FAILED", "Unable to search suppliers.");
  }
  return (data ?? []) as SupplierOption[];
}

export async function resolveSupplierFilterOption(
  supplierId: string,
): Promise<PartnerFilterOption | null> {
  await requireAdmin();
  if (!supplierId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_suppliers")
    .select("id, name, supplier_code, is_active")
    .eq("id", supplierId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "SUPPLIER_LOOKUP_FAILED",
      "Unable to load that supplier.",
    );
  }
  if (!data) return null;

  const inactive = data.is_active ? "" : " (inactive)";
  return {
    id: data.id,
    label: `${data.name} · ${data.supplier_code}${inactive}`,
  };
}

export async function countActiveSuppliers(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("stock_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) {
    throw new AppError(500, "SUPPLIER_LIST_FAILED", "Unable to load suppliers.");
  }
  return count ?? 0;
}
