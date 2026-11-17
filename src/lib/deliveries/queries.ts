import "server-only";

import { requireAdmin, requireStaffOrAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database, DeliveryStatus, Json } from "@/types/database";
import {
  formatAuditDescription,
  resolveActorLabel,
} from "@/lib/audit-logs/presentation";
import { sanitizeAuditMetadata } from "@/lib/audit-logs/sanitize";
import {
  assignmentHistoryEventLabel,
  formatDeliveryDateTime,
} from "./presentation";
import {
  FILTER_OPTION_LIMIT,
  SEARCH_SCOPE_ID_LIMIT,
} from "@/lib/query-limits";
import {
  listDeliveriesQuerySchema,
  type ListDeliveriesQuery,
} from "./schemas";

export const DELIVERIES_PAGE_SIZE = 20;

export type DeliveryRow = Database["public"]["Tables"]["deliveries"]["Row"];
export type DeliveryHistoryRow =
  Database["public"]["Tables"]["delivery_status_history"]["Row"];
export type SupplyItemRow = Database["public"]["Tables"]["supply_items"]["Row"];

export type DeliveryVendorSummary = {
  id: string;
  vendor_code: string;
  business_name: string;
  contact_person: string;
  phone: string;
  location: string;
};

export type DeliverySupplySummary = {
  id: string;
  supply_ref: string;
  supply_date: string;
  vendor_id: string;
  vendor: DeliveryVendorSummary | null;
};

export type DeliveryDriverSummary = {
  id: string;
  driver_code: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

export type DeliveryStaffSummary = {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_active: boolean;
};

export type DeliveryListRow = DeliveryRow & {
  supply: DeliverySupplySummary | null;
  driver: DeliveryDriverSummary | null;
  responsible_staff: DeliveryStaffSummary | null;
};

export type DeliverySupplyItemDetail = SupplyItemRow & {
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type DeliveryHistoryEntry = DeliveryHistoryRow & {
  actor_name: string | null;
};

export type DeliveryDetail = DeliveryRow & {
  supply: (DeliverySupplySummary & {
    items: DeliverySupplyItemDetail[];
  }) | null;
  driver: DeliveryDriverSummary | null;
  responsible_staff: DeliveryStaffSummary | null;
  history: DeliveryHistoryEntry[];
};

/** Assignment page only — no supply lines, history, or actor profiles. */
export type DeliveryAssignmentDetail = {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
  delivery_date: string;
  vendor_location: string;
  driver_id: string | null;
  responsible_staff_id: string;
  updated_at: string;
  supply: {
    vendor: Pick<DeliveryVendorSummary, "business_name" | "location"> | null;
  } | null;
  driver: DeliveryDriverSummary | null;
  responsible_staff: DeliveryStaffSummary | null;
};

export type DeliveryStatusSummary = {
  total: number;
  pending: number;
  dispatched: number;
  delivered: number;
  failedOrCancelled: number;
};

export type ListDeliveriesResult = {
  deliveries: DeliveryListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListDeliveriesQuery;
  summary: DeliveryStatusSummary;
};

export type ActiveDriverOption = DeliveryDriverSummary;
export type EligibleStaffOption = DeliveryStaffSummary;

export type LinkedDeliverySummary = {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function resolveSearchScope(
  supabase: SupabaseClient,
  rawTerm: string,
): Promise<{
  deliveryRefTerm: string | null;
  supplyIds: string[];
  driverIds: string[];
}> {
  const safe = sanitizeSearch(rawTerm);
  if (!safe) {
    return { deliveryRefTerm: null, supplyIds: [], driverIds: [] };
  }

  const term = `%${safe}%`;

  const [vendorsResult, suppliesResult, driversResult] = await Promise.all([
    supabase
      .from("vendors")
      .select("id")
      .or(
        `business_name.ilike.${term},vendor_code.ilike.${term},phone.ilike.${term},contact_person.ilike.${term}`,
      )
      .limit(SEARCH_SCOPE_ID_LIMIT),
    supabase
      .from("supplies")
      .select("id")
      .ilike("supply_ref", term)
      .limit(SEARCH_SCOPE_ID_LIMIT),
    supabase
      .from("drivers")
      .select("id")
      .or(`driver_code.ilike.${term},full_name.ilike.${term},phone.ilike.${term}`)
      .limit(SEARCH_SCOPE_ID_LIMIT),
  ]);

  if (vendorsResult.error || suppliesResult.error || driversResult.error) {
    throw new AppError(500, "DELIVERY_LIST_FAILED", "Unable to load deliveries.");
  }

  const vendorIds = (vendorsResult.data ?? []).map((row) => row.id);
  let supplyIds = (suppliesResult.data ?? []).map((row) => row.id);

  if (vendorIds.length > 0) {
    const { data: vendorSupplies, error } = await supabase
      .from("supplies")
      .select("id")
      .in("vendor_id", vendorIds)
      .limit(SEARCH_SCOPE_ID_LIMIT);
    if (error) {
      throw new AppError(500, "DELIVERY_LIST_FAILED", "Unable to load deliveries.");
    }
    supplyIds = [
      ...new Set([...supplyIds, ...(vendorSupplies ?? []).map((row) => row.id)]),
    ].slice(0, SEARCH_SCOPE_ID_LIMIT);
  }

  return {
    deliveryRefTerm: term,
    supplyIds,
    driverIds: (driversResult.data ?? []).map((row) => row.id),
  };
}

type FilterableQuery = {
  eq: (column: string, value: unknown) => FilterableQuery;
  in: (column: string, values: readonly string[]) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
  is: (column: string, value: null) => FilterableQuery;
  not: (column: string, operator: string, value: unknown) => FilterableQuery;
  or: (filters: string) => FilterableQuery;
};

function applyCommonFilters<T extends FilterableQuery>(
  query: T,
  parsed: ListDeliveriesQuery,
  search: Awaited<ReturnType<typeof resolveSearchScope>>,
  options: { includeStatus?: boolean } = {},
): T {
  let next = query;

  if (options.includeStatus !== false && parsed.status) {
    if (parsed.status === "OPEN") {
      next = next.in("status", ["PENDING", "DISPATCHED"]) as T;
    } else {
      next = next.eq("status", parsed.status) as T;
    }
  }
  if (parsed.fromDate) {
    next = next.gte("delivery_date", parsed.fromDate) as T;
  }
  if (parsed.toDate) {
    next = next.lte("delivery_date", parsed.toDate) as T;
  }
  if (parsed.staffId) {
    next = next.eq("responsible_staff_id", parsed.staffId) as T;
  }
  if (parsed.driverId === "unassigned") {
    next = next.is("driver_id", null) as T;
  } else if (parsed.driverId) {
    next = next.eq("driver_id", parsed.driverId) as T;
  }

  if (parsed.assignmentState === "NEEDS_DRIVER") {
    next = next.is("driver_id", null) as T;
  } else if (parsed.assignmentState === "HAS_DRIVER") {
    next = next.not("driver_id", "is", null) as T;
  }

  if (search.deliveryRefTerm) {
    const parts = [`delivery_ref.ilike.${search.deliveryRefTerm}`];
    if (search.supplyIds.length > 0) {
      parts.push(`supply_id.in.(${search.supplyIds.join(",")})`);
    }
    if (search.driverIds.length > 0) {
      parts.push(`driver_id.in.(${search.driverIds.join(",")})`);
    }
    next = next.or(parts.join(",")) as T;
  }

  return next;
}

const LIST_SELECT = `
  id,
  delivery_ref,
  supply_id,
  driver_id,
  responsible_staff_id,
  vendor_location,
  delivery_date,
  status,
  updated_at,
  created_at,
  supply:supplies (
    id,
    supply_ref,
    supply_date,
    vendor_id,
    vendor:vendors (
      id,
      vendor_code,
      business_name,
      phone
    )
  ),
  driver:drivers (
    id,
    driver_code,
    full_name,
    phone,
    is_active
  ),
  responsible_staff:profiles!deliveries_responsible_staff_id_fkey (
    id,
    full_name,
    role,
    is_active
  )
`;

function mapListRow(row: Record<string, unknown>): DeliveryListRow {
  const supplyRaw = asSingle(row.supply as DeliverySupplySummary | DeliverySupplySummary[] | null);
  const driver = asSingle(row.driver as DeliveryDriverSummary | DeliveryDriverSummary[] | null);
  const responsibleStaff = asSingle(
    row.responsible_staff as DeliveryStaffSummary | DeliveryStaffSummary[] | null,
  );

  const supply = supplyRaw
    ? {
        ...supplyRaw,
        vendor: asSingle(supplyRaw.vendor),
      }
    : null;

  const delivery = { ...row };
  delete delivery.supply;
  delete delivery.driver;
  delete delivery.responsible_staff;

  return {
    ...(delivery as DeliveryRow),
    supply,
    driver,
    responsible_staff: responsibleStaff,
  };
}

export async function listDeliveries(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListDeliveriesResult> {
  await requireStaffOrAdmin();

  const parsed = listDeliveriesQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "",
    fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
    toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
    staffId: typeof rawQuery.staffId === "string" ? rawQuery.staffId : "",
    driverId: typeof rawQuery.driverId === "string" ? rawQuery.driverId : "",
    assignmentState:
      typeof rawQuery.assignmentState === "string" ? rawQuery.assignmentState : "",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const search = await resolveSearchScope(supabase, parsed.q);
  const from = (parsed.page - 1) * DELIVERIES_PAGE_SIZE;
  const to = from + DELIVERIES_PAGE_SIZE - 1;

  let listQuery = supabase
    .from("deliveries")
    .select(LIST_SELECT, { count: "exact" })
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  listQuery = applyCommonFilters(listQuery as never, parsed, search, {
    includeStatus: true,
  }) as typeof listQuery;

  const summaryBase = {
    total: 0,
    pending: 0,
    dispatched: 0,
    delivered: 0,
    failedOrCancelled: 0,
  };

  const countStatus = async (status?: DeliveryStatus | "FAILED_OR_CANCELLED") => {
    let q = supabase.from("deliveries").select("id", { count: "exact", head: true });
    q = applyCommonFilters(q as never, parsed, search, { includeStatus: false }) as typeof q;
    if (status === "FAILED_OR_CANCELLED") {
      q = q.in("status", ["FAILED", "CANCELLED"]);
    } else if (status) {
      q = q.eq("status", status);
    }
    const { count, error } = await q;
    if (error) {
      throw new AppError(500, "DELIVERY_LIST_FAILED", "Unable to load deliveries.");
    }
    return count ?? 0;
  };

  const [listResult, totalAll, pending, dispatched, delivered, failedOrCancelled] =
    await Promise.all([
      listQuery,
      countStatus(),
      countStatus("PENDING"),
      countStatus("DISPATCHED"),
      countStatus("DELIVERED"),
      countStatus("FAILED_OR_CANCELLED"),
    ]);

  if (listResult.error) {
    throw new AppError(500, "DELIVERY_LIST_FAILED", "Unable to load deliveries.");
  }

  return {
    deliveries: (listResult.data ?? []).map((row) =>
      mapListRow(row as Record<string, unknown>),
    ),
    total: listResult.count ?? 0,
    page: parsed.page,
    pageSize: DELIVERIES_PAGE_SIZE,
    query: parsed,
    summary: {
      ...summaryBase,
      total: totalAll,
      pending,
      dispatched,
      delivered,
      failedOrCancelled,
    },
  };
}

export async function getDelivery(deliveryId: string): Promise<DeliveryDetail> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
      *,
      supply:supplies (
        id,
        supply_ref,
        supply_date,
        vendor_id,
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
        )
      ),
      driver:drivers (
        id,
        driver_code,
        full_name,
        phone,
        is_active
      ),
      responsible_staff:profiles!deliveries_responsible_staff_id_fkey (
        id,
        full_name,
        email,
        role,
        is_active
      )
    `,
    )
    .eq("id", deliveryId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "DELIVERY_LOOKUP_FAILED", "Unable to load that delivery.");
  }
  if (!data) {
    throw new AppError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("delivery_status_history")
    .select("*")
    .eq("delivery_id", deliveryId)
    .order("created_at", { ascending: true });

  if (historyError) {
    throw new AppError(
      500,
      "DELIVERY_HISTORY_FAILED",
      "Unable to load delivery history.",
    );
  }

  const actorIds = [
    ...new Set(
      (historyRows ?? [])
        .map((row) => row.changed_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const profile of profiles ?? []) {
      actorNames.set(profile.id, profile.full_name);
    }
  }

  const row = data as Record<string, unknown>;
  const supplyRaw = asSingle(
    row.supply as
      | (DeliverySupplySummary & { items?: DeliverySupplyItemDetail[] | null })
      | (DeliverySupplySummary & { items?: DeliverySupplyItemDetail[] | null })[]
      | null,
  );
  const driver = asSingle(row.driver as DeliveryDriverSummary | DeliveryDriverSummary[] | null);
  const responsibleStaff = asSingle(
    row.responsible_staff as DeliveryStaffSummary | DeliveryStaffSummary[] | null,
  );

  const delivery = { ...row };
  delete delivery.supply;
  delete delivery.driver;
  delete delivery.responsible_staff;

  return {
    ...(delivery as DeliveryRow),
    supply: supplyRaw
      ? {
          ...supplyRaw,
          vendor: asSingle(supplyRaw.vendor),
          items: supplyRaw.items ?? [],
        }
      : null,
    driver,
    responsible_staff: responsibleStaff,
    history: (historyRows ?? []).map((entry) => ({
      ...entry,
      actor_name: entry.changed_by
        ? actorNames.get(entry.changed_by) ?? null
        : null,
    })),
  };
}

export async function getDeliveryForAssignment(
  deliveryId: string,
): Promise<DeliveryAssignmentDetail> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
      id,
      delivery_ref,
      status,
      delivery_date,
      vendor_location,
      driver_id,
      responsible_staff_id,
      updated_at,
      supply:supplies (
        vendor:vendors (
          business_name,
          location
        )
      ),
      driver:drivers (
        id,
        driver_code,
        full_name,
        phone,
        is_active
      ),
      responsible_staff:profiles!deliveries_responsible_staff_id_fkey (
        id,
        full_name,
        email,
        role,
        is_active
      )
    `,
    )
    .eq("id", deliveryId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "DELIVERY_LOOKUP_FAILED", "Unable to load that delivery.");
  }
  if (!data) {
    throw new AppError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
  }

  const row = data as Record<string, unknown>;
  const supplyRaw = asSingle(
    row.supply as
      | { vendor: DeliveryVendorSummary | DeliveryVendorSummary[] | null }
      | { vendor: DeliveryVendorSummary | DeliveryVendorSummary[] | null }[]
      | null,
  );
  const vendor = supplyRaw ? asSingle(supplyRaw.vendor) : null;

  return {
    id: data.id,
    delivery_ref: data.delivery_ref,
    status: data.status,
    delivery_date: data.delivery_date,
    vendor_location: data.vendor_location,
    driver_id: data.driver_id,
    responsible_staff_id: data.responsible_staff_id,
    updated_at: data.updated_at,
    supply: {
      vendor: vendor
        ? { business_name: vendor.business_name, location: vendor.location }
        : null,
    },
    driver: asSingle(row.driver as DeliveryDriverSummary | DeliveryDriverSummary[] | null),
    responsible_staff: asSingle(
      row.responsible_staff as DeliveryStaffSummary | DeliveryStaffSummary[] | null,
    ),
  };
}

export async function getDeliveryForSupply(
  supplyId: string,
): Promise<LinkedDeliverySummary | null> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, delivery_ref, status")
    .eq("supply_id", supplyId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "DELIVERY_LOOKUP_FAILED",
      "Unable to load the linked delivery.",
    );
  }

  return data as LinkedDeliverySummary | null;
}

export async function listActiveDriversForAssignment(): Promise<ActiveDriverOption[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("id, driver_code, full_name, phone, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    throw new AppError(500, "DRIVER_LIST_FAILED", "Unable to load drivers.");
  }

  return (data ?? []) as ActiveDriverOption[];
}

export async function listDriversForFilter(): Promise<ActiveDriverOption[]> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("id, driver_code, full_name, phone, is_active")
    .order("full_name", { ascending: true })
    .limit(FILTER_OPTION_LIMIT);

  if (error) {
    throw new AppError(500, "DRIVER_LIST_FAILED", "Unable to load drivers.");
  }

  return (data ?? []) as ActiveDriverOption[];
}

/** Filter dropdowns on STAFF+ADMIN delivery lists (not assignment mutations). */
export async function listStaffForFilter(): Promise<EligibleStaffOption[]> {
  await requireStaffOrAdmin();
  return loadEligibleStaffOptions({ limit: FILTER_OPTION_LIMIT });
}

/** Assignment pickers — ADMIN only (Phase A). Uncapped so every eligible staff remains selectable. */
export async function listEligibleStaffForAssignment(): Promise<EligibleStaffOption[]> {
  await requireAdmin();
  return loadEligibleStaffOptions();
}

async function loadEligibleStaffOptions(options?: {
  limit?: number;
}): Promise<EligibleStaffOption[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("is_active", true)
    .in("role", ["ADMIN", "STAFF"])
    .order("full_name", { ascending: true });
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(500, "STAFF_LIST_FAILED", "Unable to load staff members.");
  }

  return (data ?? []) as EligibleStaffOption[];
}

/** ADMIN dispatch workspace list — same filters as deliveries, stricter gate. */
export async function listDispatchDeliveries(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListDeliveriesResult> {
  await requireAdmin();
  return listDeliveries(rawQuery);
}

export type DeliveryAssignmentHistoryEntry = {
  id: string;
  action: string;
  eventLabel: string;
  description: string;
  actorLabel: string;
  createdAt: string;
  createdAtLabel: string;
  changeKind: string | null;
};

/**
 * ADMIN-only chronological assignment events from audit_logs.
 * STAFF never call this — delivery detail gates the section on ADMIN role.
 */
export async function listDeliveryAssignmentHistory(
  deliveryId: string,
): Promise<DeliveryAssignmentHistoryEntry[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, actor_id, metadata, created_at")
    .eq("entity_type", "deliveries")
    .eq("entity_id", deliveryId)
    .in("action", ["DELIVERY_DRIVER_SET", "DELIVERY_STAFF_SET"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError(
      500,
      "DELIVERY_ASSIGNMENT_HISTORY_FAILED",
      "Unable to load assignment history.",
    );
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(
      rows
        .map((row) => row.actor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const profile of profiles ?? []) {
      actorNames.set(profile.id, profile.full_name);
    }
  }

  return rows.map((row) => {
    const sanitized = sanitizeAuditMetadata(row.metadata as Json);
    const changeKind =
      typeof sanitized.change_kind === "string" ? sanitized.change_kind : null;
    const actorFromMeta =
      typeof sanitized.actor_name === "string" ? sanitized.actor_name : null;
    const actorLabel = resolveActorLabel({
      actorId: row.actor_id,
      fullName:
        actorFromMeta ??
        (row.actor_id ? actorNames.get(row.actor_id) ?? null : null),
    });

    return {
      id: row.id,
      action: row.action,
      eventLabel: assignmentHistoryEventLabel(row.action, changeKind),
      description: formatAuditDescription(row.action, sanitized),
      actorLabel,
      createdAt: row.created_at,
      createdAtLabel: formatDeliveryDateTime(row.created_at),
      changeKind,
    };
  });
}
