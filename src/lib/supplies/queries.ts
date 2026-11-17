import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import { SEARCH_SCOPE_ID_LIMIT } from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listSuppliesQuerySchema, type ListSuppliesQuery } from "./schemas";

export const SUPPLIES_PAGE_SIZE = 20;

export type SupplyRow = Database["public"]["Tables"]["supplies"]["Row"];
export type SupplyItemRow = Database["public"]["Tables"]["supply_items"]["Row"];
export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export type SupplyVendorSummary = {
  id: string;
  vendor_code: string;
  business_name: string;
  contact_person: string;
  phone: string;
  location: string;
};

export type SupplyListRow = SupplyRow & {
  vendor: SupplyVendorSummary | null;
  item_count: number;
  total_quantity: number;
  recorded_by_name: string | null;
};

export type SupplyItemDetail = SupplyItemRow & {
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type SupplyDetail = SupplyRow & {
  vendor: SupplyVendorSummary | null;
  items: SupplyItemDetail[];
  payment: PaymentRow | null;
  recorded_by_name: string | null;
};

export type ListSuppliesResult = {
  supplies: SupplyListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListSuppliesQuery;
};

export type ActiveVendorOption = SupplyVendorSummary & {
  is_active: boolean;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listSupplies(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListSuppliesResult> {
  await requireStaffOrAdmin();

  const parsed = listSuppliesQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    vendorId: typeof rawQuery.vendorId === "string" ? rawQuery.vendorId : "",
    fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
    toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * SUPPLIES_PAGE_SIZE;
  const to = from + SUPPLIES_PAGE_SIZE - 1;

  let query = supabase
    .from("supplies")
    .select(
      `
      id,
      supply_ref,
      vendor_id,
      supply_date,
      grand_total,
      payment_status,
      recorded_by,
      created_at,
      updated_at,
      vendor:vendors (
        id,
        vendor_code,
        business_name,
        phone
      ),
      items:supply_items ( quantity )
    `,
      { count: "exact" },
    )
    .order("supply_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.vendorId) {
    query = query.eq("vendor_id", parsed.vendorId);
  }
  if (parsed.fromDate) {
    query = query.gte("supply_date", parsed.fromDate);
  }
  if (parsed.toDate) {
    query = query.lte("supply_date", parsed.toDate);
  }

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    const { data: matchingVendors, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .or(`business_name.ilike.${term},vendor_code.ilike.${term}`)
      .limit(SEARCH_SCOPE_ID_LIMIT);

    if (vendorError) {
      throw new AppError(500, "SUPPLY_LIST_FAILED", "Unable to load supplies.");
    }

    const vendorIds = (matchingVendors ?? []).map((row) => row.id);
    if (vendorIds.length > 0) {
      query = query.or(
        `supply_ref.ilike.${term},vendor_id.in.(${vendorIds.join(",")})`,
      );
    } else {
      query = query.ilike("supply_ref", term);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "SUPPLY_LIST_FAILED", "Unable to load supplies.");
  }

  const recorderIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.recorded_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const recorderNames = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", recorderIds);
    for (const profile of profiles ?? []) {
      recorderNames.set(profile.id, profile.full_name);
    }
  }

  const supplies: SupplyListRow[] = (data ?? []).map((row) => {
    const { items, vendor, ...supply } = row as SupplyRow & {
      vendor: SupplyVendorSummary | SupplyVendorSummary[] | null;
      items: { quantity: number }[] | null;
    };
    const vendorValue = Array.isArray(vendor) ? vendor[0] ?? null : vendor;
    const itemRows = items ?? [];
    return {
      ...(supply as SupplyRow),
      vendor: vendorValue,
      item_count: itemRows.length,
      total_quantity: itemRows.reduce((sum, item) => sum + item.quantity, 0),
      recorded_by_name: supply.recorded_by
        ? recorderNames.get(supply.recorded_by) ?? null
        : null,
    };
  });

  return {
    supplies,
    total: count ?? 0,
    page: parsed.page,
    pageSize: SUPPLIES_PAGE_SIZE,
    query: parsed,
  };
}

export async function getSupply(supplyId: string): Promise<SupplyDetail> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplies")
    .select(
      `
      *,
      vendor:vendors (
        id,
        vendor_code,
        business_name,
        contact_person,
        phone,
        location
      ),
      items:supply_items (
        *,
        product:products (
          id,
          product_code,
          name,
          brand,
          packaging_size,
          unit_of_measure
        )
      ),
      payment:payments (*)
    `,
    )
    .eq("id", supplyId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "SUPPLY_LOOKUP_FAILED", "Unable to load that supply.");
  }
  if (!data) {
    throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found.");
  }

  const row = data as SupplyRow & {
    vendor: SupplyVendorSummary | SupplyVendorSummary[] | null;
    items: SupplyItemDetail[] | null;
    payment: PaymentRow | PaymentRow[] | null;
  };

  let recordedByName: string | null = null;
  if (row.recorded_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.recorded_by)
      .maybeSingle();
    recordedByName = profile?.full_name ?? null;
  }

  const payment = Array.isArray(row.payment)
    ? row.payment[0] ?? null
    : row.payment;

  return {
    ...row,
    vendor: Array.isArray(row.vendor) ? row.vendor[0] ?? null : row.vendor,
    items: row.items ?? [],
    payment,
    recorded_by_name: recordedByName,
  };
}

export async function listActiveVendorsForSupply(): Promise<ActiveVendorOption[]> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select(
      "id, vendor_code, business_name, contact_person, phone, location, is_active",
    )
    .eq("is_active", true)
    .order("business_name", { ascending: true });

  if (error) {
    throw new AppError(500, "VENDOR_LIST_FAILED", "Unable to load vendors.");
  }

  return (data ?? []) as ActiveVendorOption[];
}
