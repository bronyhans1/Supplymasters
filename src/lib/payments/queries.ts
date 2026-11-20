import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import {
  FILTER_OPTION_LIMIT,
  SEARCH_SCOPE_ID_LIMIT,
} from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database, DeliveryStatus, PaymentMethod } from "@/types/database";
import { ghanaCalendarDate } from "./presentation";
import { listPaymentsQuerySchema, type ListPaymentsQuery } from "./schemas";
import {
  aggregatePaymentAmounts,
  type PaymentAggregate,
  type PaymentMethodBreakdown,
} from "./summaries";

export const PAYMENTS_PAGE_SIZE = 20;

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type SupplyItemRow = Database["public"]["Tables"]["supply_items"]["Row"];

export type PaymentVendorSummary = {
  id: string;
  vendor_code: string;
  business_name: string;
  contact_person: string;
  phone: string;
  location: string;
};

export type PaymentSupplySummary = {
  id: string;
  supply_ref: string;
  supply_date: string;
  grand_total: number;
  payment_status: Database["public"]["Enums"]["payment_status"];
  vendor_id: string;
};

export type PaymentListRow = PaymentRow & {
  vendor: PaymentVendorSummary | null;
  supply: PaymentSupplySummary | null;
  recorded_by_name: string | null;
};

export type PaymentSupplyItemDetail = SupplyItemRow & {
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type PaymentDeliverySummary = {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
};

export type PaymentDetail = PaymentRow & {
  vendor: PaymentVendorSummary | null;
  supply: (PaymentSupplySummary & {
    items: PaymentSupplyItemDetail[];
  }) | null;
  delivery: PaymentDeliverySummary | null;
  recorded_by_name: string | null;
};

export type PaymentSummaryCards = {
  matchingCount: number;
  matchingAmount: number;
  todayCount: number;
  todayAmount: number;
  todayDate: string;
  byMethod: PaymentMethodBreakdown[];
  scopeNote: string;
};

export type ListPaymentsResult = {
  payments: PaymentListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListPaymentsQuery;
  summary: PaymentSummaryCards;
};

export type PaymentVendorOption = {
  id: string;
  vendor_code: string;
  business_name: string;
  is_active: boolean;
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
  term: string | null;
  supplyIds: string[];
  vendorIds: string[];
}> {
  const safe = sanitizeSearch(rawTerm);
  if (!safe) {
    return { term: null, supplyIds: [], vendorIds: [] };
  }

  const term = `%${safe}%`;

  const [vendorsResult, suppliesResult] = await Promise.all([
    supabase
      .from("vendors")
      .select("id")
      .or(
        `business_name.ilike.${term},vendor_code.ilike.${term},phone.ilike.${term}`,
      )
      .limit(SEARCH_SCOPE_ID_LIMIT),
    supabase
      .from("supplies")
      .select("id")
      .ilike("supply_ref", term)
      .limit(SEARCH_SCOPE_ID_LIMIT),
  ]);

  if (vendorsResult.error || suppliesResult.error) {
    throw new AppError(500, "PAYMENT_LIST_FAILED", "Unable to load payments.");
  }

  return {
    term,
    supplyIds: (suppliesResult.data ?? []).map((row) => row.id),
    vendorIds: (vendorsResult.data ?? []).map((row) => row.id),
  };
}

type FilterableQuery = {
  eq: (column: string, value: unknown) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
  or: (filters: string) => FilterableQuery;
};

function applyPaymentFilters<T extends FilterableQuery>(
  query: T,
  parsed: ListPaymentsQuery,
  search: Awaited<ReturnType<typeof resolveSearchScope>>,
  options: { includeMethod?: boolean; includeDates?: boolean } = {},
): T {
  let next = query;
  const includeMethod = options.includeMethod !== false;
  const includeDates = options.includeDates !== false;

  if (includeMethod && parsed.paymentMethod) {
    next = next.eq("payment_method", parsed.paymentMethod) as T;
  }
  if (parsed.vendorId) {
    next = next.eq("vendor_id", parsed.vendorId) as T;
  }
  if (includeDates && parsed.fromDate) {
    next = next.gte("payment_date", parsed.fromDate) as T;
  }
  if (includeDates && parsed.toDate) {
    next = next.lte("payment_date", parsed.toDate) as T;
  }

  if (search.term) {
    const parts = [
      `payment_ref.ilike.${search.term}`,
      `transaction_reference.ilike.${search.term}`,
    ];
    if (search.supplyIds.length > 0) {
      parts.push(`supply_id.in.(${search.supplyIds.join(",")})`);
    }
    if (search.vendorIds.length > 0) {
      parts.push(`vendor_id.in.(${search.vendorIds.join(",")})`);
    }
    next = next.or(parts.join(",")) as T;
  }

  return next;
}

const LIST_SELECT = `
  id,
  payment_ref,
  supply_id,
  vendor_id,
  amount,
  payment_method,
  payment_date,
  transaction_reference,
  recorded_by,
  created_at,
  vendor:vendors (
    id,
    vendor_code,
    business_name,
    phone
  ),
  supply:supplies (
    id,
    supply_ref,
    supply_date,
    grand_total,
    payment_status,
    vendor_id
  )
`;

function mapListRow(
  row: Record<string, unknown>,
  recorderNames: Map<string, string>,
): PaymentListRow {
  const vendor = asSingle(
    row.vendor as PaymentVendorSummary | PaymentVendorSummary[] | null,
  );
  const supply = asSingle(
    row.supply as PaymentSupplySummary | PaymentSupplySummary[] | null,
  );

  const payment = { ...row };
  delete payment.vendor;
  delete payment.supply;

  const recordedBy = (payment as PaymentRow).recorded_by;

  return {
    ...(payment as PaymentRow),
    vendor,
    supply,
    recorded_by_name: recordedBy ? recorderNames.get(recordedBy) ?? null : null,
  };
}

async function loadRecorderNames(
  supabase: SupabaseClient,
  recordedByIds: string[],
): Promise<Map<string, string>> {
  const recorderNames = new Map<string, string>();
  if (recordedByIds.length === 0) return recorderNames;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", recordedByIds);

  for (const profile of profiles ?? []) {
    recorderNames.set(profile.id, profile.full_name);
  }
  return recorderNames;
}

async function fetchAggregateRows(
  supabase: SupabaseClient,
  parsed: ListPaymentsQuery,
  search: Awaited<ReturnType<typeof resolveSearchScope>>,
  options: { includeMethod?: boolean; includeDates?: boolean } = {},
): Promise<PaymentAggregate> {
  let query = supabase.from("payments").select("amount, payment_method");
  query = applyPaymentFilters(query as never, parsed, search, options) as typeof query;

  const { data, error } = await query;
  if (error) {
    throw new AppError(500, "PAYMENT_LIST_FAILED", "Unable to load payments.");
  }

  return aggregatePaymentAmounts(
    (data ?? []).map((row) => ({
      amount: Number(row.amount),
      payment_method: row.payment_method as PaymentMethod,
    })),
  );
}

export async function listPayments(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListPaymentsResult> {
  await requireStaffOrAdmin();

  const parsed = listPaymentsQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    paymentMethod:
      typeof rawQuery.paymentMethod === "string" ? rawQuery.paymentMethod : "",
    fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
    toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
    vendorId: typeof rawQuery.vendorId === "string" ? rawQuery.vendorId : "",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const search = await resolveSearchScope(supabase, parsed.q);
  const from = (parsed.page - 1) * PAYMENTS_PAGE_SIZE;
  const to = from + PAYMENTS_PAGE_SIZE - 1;

  let listQuery = supabase
    .from("payments")
    .select(LIST_SELECT, { count: "exact" })
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  listQuery = applyPaymentFilters(listQuery as never, parsed, search) as typeof listQuery;

  const todayDate = ghanaCalendarDate();
  const todayParsed: ListPaymentsQuery = {
    ...parsed,
    fromDate: todayDate,
    toDate: todayDate,
    paymentMethod: "",
    q: "",
    vendorId: "",
    page: 1,
  };

  const [listResult, matchingAggregate, todayAggregate] = await Promise.all([
    listQuery,
    fetchAggregateRows(supabase, parsed, search),
    fetchAggregateRows(supabase, todayParsed, { term: null, supplyIds: [], vendorIds: [] }),
  ]);

  if (listResult.error) {
    throw new AppError(500, "PAYMENT_LIST_FAILED", "Unable to load payments.");
  }

  const recorderIds = [
    ...new Set(
      (listResult.data ?? [])
        .map((row) => row.recorded_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const recorderNames = await loadRecorderNames(supabase, recorderIds);

  const payments = (listResult.data ?? []).map((row) =>
    mapListRow(row as unknown as Record<string, unknown>, recorderNames),
  );

  const hasFilterScope = Boolean(
    parsed.q ||
      parsed.paymentMethod ||
      parsed.fromDate ||
      parsed.toDate ||
      parsed.vendorId,
  );

  return {
    payments,
    total: listResult.count ?? 0,
    page: parsed.page,
    pageSize: PAYMENTS_PAGE_SIZE,
    query: parsed,
    summary: {
      matchingCount: matchingAggregate.count,
      matchingAmount: matchingAggregate.totalAmount,
      todayCount: todayAggregate.count,
      todayAmount: todayAggregate.totalAmount,
      todayDate,
      byMethod: matchingAggregate.byMethod,
      scopeNote: hasFilterScope
        ? "Matching totals and method breakdown use the current search, method, vendor, and date filters. Payments today is always today’s Ghana calendar date and ignores other filters."
        : "Matching totals and method breakdown cover all payment records. Payments today is today’s Ghana calendar date.",
    },
  };
}

export async function getPayment(paymentId: string): Promise<PaymentDetail> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
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
      supply:supplies (
        id,
        supply_ref,
        supply_date,
        grand_total,
        payment_status,
        vendor_id,
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
      )
    `,
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "PAYMENT_LOOKUP_FAILED", "Unable to load that payment.");
  }
  if (!data) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  // vendors FK exists in SQL; generated Database Relationships currently omit it.
  const row = data as unknown as PaymentRow & {
    vendor: PaymentVendorSummary | PaymentVendorSummary[] | null;
    supply:
      | (PaymentSupplySummary & {
          items: PaymentSupplyItemDetail[] | null;
        })
      | (PaymentSupplySummary & {
          items: PaymentSupplyItemDetail[] | null;
        })[]
      | null;
  };

  const vendor = asSingle(row.vendor);
  const supplyRaw = asSingle(row.supply);
  const supply = supplyRaw
    ? {
        id: supplyRaw.id,
        supply_ref: supplyRaw.supply_ref,
        supply_date: supplyRaw.supply_date,
        grand_total: supplyRaw.grand_total,
        payment_status: supplyRaw.payment_status,
        vendor_id: supplyRaw.vendor_id,
        items: supplyRaw.items ?? [],
      }
    : null;

  let delivery: PaymentDeliverySummary | null = null;
  if (row.supply_id) {
    const { data: deliveryRow, error: deliveryError } = await supabase
      .from("deliveries")
      .select("id, delivery_ref, status")
      .eq("supply_id", row.supply_id)
      .maybeSingle();

    if (deliveryError) {
      throw new AppError(
        500,
        "PAYMENT_LOOKUP_FAILED",
        "Unable to load that payment.",
      );
    }
    delivery = deliveryRow as PaymentDeliverySummary | null;
  }

  let recordedByName: string | null = null;
  if (row.recorded_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.recorded_by)
      .maybeSingle();
    recordedByName = profile?.full_name ?? null;
  }

  const payment: PaymentRow = {
    id: row.id,
    payment_ref: row.payment_ref,
    supply_id: row.supply_id,
    vendor_id: row.vendor_id,
    amount: row.amount,
    payment_method: row.payment_method,
    payment_date: row.payment_date,
    transaction_reference: row.transaction_reference,
    recorded_by: row.recorded_by,
    notes: row.notes,
    created_at: row.created_at,
  };

  return {
    ...payment,
    vendor,
    supply,
    delivery,
    recorded_by_name: recordedByName,
  };
}

export async function listVendorsForPaymentFilter(): Promise<PaymentVendorOption[]> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, business_name, is_active")
    .order("business_name", { ascending: true })
    .limit(FILTER_OPTION_LIMIT);

  if (error) {
    throw new AppError(500, "VENDOR_LIST_FAILED", "Unable to load vendors.");
  }

  return (data ?? []) as PaymentVendorOption[];
}

export type PendingPaymentObligation = {
  id: string;
  supply_ref: string;
  supply_date: string;
  grand_total: number;
  payment_status: Database["public"]["Enums"]["payment_status"];
  vendor: PaymentVendorSummary | null;
};

export type ListPendingObligationsResult = {
  obligations: PendingPaymentObligation[];
  total: number;
  page: number;
  pageSize: number;
};

const PENDING_PAGE_SIZE = 20;

/**
 * Unpaid supplies = pending payment obligations (no payments row yet).
 */
export async function listPendingPaymentObligations(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListPendingObligationsResult> {
  await requireStaffOrAdmin();

  const pageRaw = typeof rawQuery.pendingPage === "string" ? rawQuery.pendingPage : "1";
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
  const from = (page - 1) * PENDING_PAGE_SIZE;
  const to = from + PENDING_PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("supplies")
    .select(
      `
      id,
      supply_ref,
      supply_date,
      grand_total,
      payment_status,
      vendor:vendors (
        id,
        vendor_code,
        business_name,
        contact_person,
        phone,
        location
      )
    `,
      { count: "exact" },
    )
    .eq("payment_status", "UNPAID")
    .order("supply_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError(
      500,
      "PENDING_PAYMENT_LIST_FAILED",
      "Unable to load pending payments.",
    );
  }

  const obligations = (data ?? []).map((row) => {
    const vendor = asSingle(
      row.vendor as PaymentVendorSummary | PaymentVendorSummary[] | null,
    );
    return {
      id: row.id,
      supply_ref: row.supply_ref,
      supply_date: row.supply_date,
      grand_total: Number(row.grand_total),
      payment_status: row.payment_status,
      vendor,
    } satisfies PendingPaymentObligation;
  });

  return {
    obligations,
    total: count ?? 0,
    page,
    pageSize: PENDING_PAGE_SIZE,
  };
}

export type UnpaidSupplyForPayment = {
  id: string;
  supply_ref: string;
  supply_date: string;
  grand_total: number;
  payment_status: Database["public"]["Enums"]["payment_status"];
  vendor: PaymentVendorSummary | null;
};

export async function getUnpaidSupplyForPayment(
  supplyId: string,
): Promise<UnpaidSupplyForPayment> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplies")
    .select(
      `
      id,
      supply_ref,
      supply_date,
      grand_total,
      payment_status,
      vendor:vendors (
        id,
        vendor_code,
        business_name,
        contact_person,
        phone,
        location
      )
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
  if (data.payment_status !== "UNPAID") {
    throw new AppError(
      409,
      "PAYMENT_ALREADY_RECORDED",
      "This supply is already fully paid.",
    );
  }

  return {
    id: data.id,
    supply_ref: data.supply_ref,
    supply_date: data.supply_date,
    grand_total: Number(data.grand_total),
    payment_status: data.payment_status,
    vendor: asSingle(
      data.vendor as PaymentVendorSummary | PaymentVendorSummary[] | null,
    ),
  };
}
