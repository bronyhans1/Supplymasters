import "server-only";

import { requireStaffOrAdmin } from "@/lib/auth/session";
import {
  FILTER_OPTION_LIMIT,
  FILTER_SEARCH_LIMIT,
  SEARCH_SCOPE_ID_LIMIT,
} from "@/lib/query-limits";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database, DeliveryStatus } from "@/types/database";
import { canRecordReturnForDeliveryStatus } from "./authorization";
import { listReturnsQuerySchema, type ListReturnsQuery } from "./schemas";

export const RETURNS_PAGE_SIZE = 20;

export type DeliveryStockReturnRow =
  Database["public"]["Tables"]["delivery_stock_returns"]["Row"];
export type DeliveryStockReturnItemRow =
  Database["public"]["Tables"]["delivery_stock_return_items"]["Row"];
export type StockMovementRow =
  Database["public"]["Tables"]["stock_movements"]["Row"];

export type ReturnVendorSummary = {
  id: string;
  vendor_code: string;
  business_name: string;
  contact_person: string;
  phone: string;
  location: string;
};

export type ReturnSupplySummary = {
  id: string;
  supply_ref: string;
  supply_date: string;
  vendor_id: string;
  vendor: ReturnVendorSummary | null;
};

export type ReturnDeliverySummary = {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
  delivery_date: string;
  supply_id: string;
  supply: ReturnSupplySummary | null;
  responsible_staff?: {
    id: string;
    full_name: string;
    email?: string;
    role: string;
  } | null;
  driver?: {
    id: string;
    driver_code: string;
    full_name: string;
    phone: string | null;
  } | null;
};

export type ReturnDeliveryFilterOption = {
  id: string;
  label: string;
};

export type ReturnListRow = DeliveryStockReturnRow & {
  delivery: ReturnDeliverySummary | null;
  returned_by_name: string | null;
  item_count: number;
  total_quantity: number;
};

export type ReturnItemDetail = DeliveryStockReturnItemRow & {
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type ReturnSupplyItemDetail = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product: {
    id: string;
    product_code: string;
    name: string;
    brand: string;
    packaging_size: string;
    unit_of_measure: string;
  } | null;
};

export type ReturnDetail = DeliveryStockReturnRow & {
  delivery: ReturnDeliverySummary | null;
  returned_by_name: string | null;
  items: ReturnItemDetail[];
  supply_items: ReturnSupplyItemDetail[];
  stock_movements: StockMovementRow[];
};

export type ListReturnsResult = {
  returns: ReturnListRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListReturnsQuery;
};

export type EligibleReturnLine = {
  productId: string;
  productCode: string;
  productName: string;
  brand: string;
  unitOfMeasure: string;
  originalQuantity: number;
  alreadyReturned: number;
  remainingQuantity: number;
};

export type ReturnEligibility = {
  delivery: {
    id: string;
    delivery_ref: string;
    status: DeliveryStatus;
    delivery_date: string;
    supply_id: string;
  };
  supply: {
    id: string;
    supply_ref: string;
    supply_date: string;
  };
  vendor: ReturnVendorSummary | null;
  canRecord: boolean;
  eligibilityMessage: string;
  lines: EligibleReturnLine[];
};

export type ReturnableDeliveryOption = {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
  delivery_date: string;
  supply_ref: string | null;
  vendor_name: string | null;
};

export type ReturnStaffOption = {
  id: string;
  full_name: string;
};

export type ReturnVendorOption = {
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

function dayStartIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function dayEndIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

async function resolveSearchScope(
  supabase: SupabaseClient,
  rawTerm: string,
): Promise<{
  term: string | null;
  deliveryIds: string[];
  returnIdsFromProducts: string[];
}> {
  const safe = sanitizeSearch(rawTerm);
  if (!safe) {
    return { term: null, deliveryIds: [], returnIdsFromProducts: [] };
  }

  const term = `%${safe}%`;

  const [vendorsResult, suppliesResult, deliveriesResult, productsResult] =
    await Promise.all([
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
      supabase
        .from("deliveries")
        .select("id")
        .ilike("delivery_ref", term)
        .limit(SEARCH_SCOPE_ID_LIMIT),
      supabase
        .from("products")
        .select("id")
        .or(`name.ilike.${term},product_code.ilike.${term}`)
        .limit(SEARCH_SCOPE_ID_LIMIT),
    ]);

  if (
    vendorsResult.error ||
    suppliesResult.error ||
    deliveriesResult.error ||
    productsResult.error
  ) {
    throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
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
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
    }
    supplyIds = [
      ...new Set([...supplyIds, ...(vendorSupplies ?? []).map((row) => row.id)]),
    ].slice(0, SEARCH_SCOPE_ID_LIMIT);
  }

  let deliveryIds = (deliveriesResult.data ?? []).map((row) => row.id);
  if (supplyIds.length > 0) {
    const { data: supplyDeliveries, error } = await supabase
      .from("deliveries")
      .select("id")
      .in("supply_id", supplyIds)
      .limit(SEARCH_SCOPE_ID_LIMIT);
    if (error) {
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
    }
    deliveryIds = [
      ...new Set([
        ...deliveryIds,
        ...(supplyDeliveries ?? []).map((row) => row.id),
      ]),
    ].slice(0, SEARCH_SCOPE_ID_LIMIT);
  }

  const productIds = (productsResult.data ?? []).map((row) => row.id);
  let returnIdsFromProducts: string[] = [];
  if (productIds.length > 0) {
    const { data: itemRows, error } = await supabase
      .from("delivery_stock_return_items")
      .select("return_id")
      .in("product_id", productIds)
      .limit(SEARCH_SCOPE_ID_LIMIT);
    if (error) {
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
    }
    returnIdsFromProducts = [
      ...new Set((itemRows ?? []).map((row) => row.return_id)),
    ].slice(0, SEARCH_SCOPE_ID_LIMIT);
  }

  return { term, deliveryIds, returnIdsFromProducts };
}

type FilterableQuery = {
  eq: (column: string, value: unknown) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
  in: (column: string, values: string[]) => FilterableQuery;
  or: (filters: string) => FilterableQuery;
};

function applyReturnFilters<T extends FilterableQuery>(
  query: T,
  parsed: ListReturnsQuery,
  search: Awaited<ReturnType<typeof resolveSearchScope>>,
  productReturnIds: string[] | null,
): T {
  let next = query;

  if (parsed.staffId) {
    next = next.eq("returned_by", parsed.staffId) as T;
  }
  if (parsed.deliveryId) {
    next = next.eq("delivery_id", parsed.deliveryId) as T;
  }
  if (parsed.fromDate) {
    next = next.gte("created_at", dayStartIso(parsed.fromDate)) as T;
  }
  if (parsed.toDate) {
    next = next.lte("created_at", dayEndIso(parsed.toDate)) as T;
  }

  if (parsed.vendorId) {
    // resolved outside via delivery ids
  }

  if (productReturnIds && productReturnIds.length === 0) {
    // Force empty result
    next = next.in("id", ["00000000-0000-0000-0000-000000000000"]) as T;
  } else if (productReturnIds && productReturnIds.length > 0) {
    next = next.in("id", productReturnIds) as T;
  }

  if (search.term) {
    const parts: string[] = [`return_ref.ilike.${search.term}`];
    if (search.deliveryIds.length > 0) {
      parts.push(`delivery_id.in.(${search.deliveryIds.join(",")})`);
    }
    if (search.returnIdsFromProducts.length > 0) {
      parts.push(`id.in.(${search.returnIdsFromProducts.join(",")})`);
    }
    next = next.or(parts.join(",")) as T;
  }

  return next;
}

const LIST_SELECT = `
  id,
  return_ref,
  delivery_id,
  returned_by,
  created_at,
  items:delivery_stock_return_items ( quantity ),
  delivery:deliveries (
    id,
    delivery_ref,
    status,
    delivery_date,
    supply_id,
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
    )
  )
`;

function mapDeliverySummary(raw: unknown): ReturnDeliverySummary | null {
  const delivery = asSingle(raw as ReturnDeliverySummary | ReturnDeliverySummary[] | null);
  if (!delivery) return null;
  const supplyRaw = asSingle(delivery.supply);
  const supply = supplyRaw
    ? {
        ...supplyRaw,
        vendor: asSingle(supplyRaw.vendor),
      }
    : null;
  return {
    ...delivery,
    supply,
    responsible_staff: asSingle(delivery.responsible_staff),
    driver: asSingle(delivery.driver),
  };
}

export async function listReturns(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListReturnsResult> {
  await requireStaffOrAdmin();

  const parsed = listReturnsQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
    toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
    vendorId: typeof rawQuery.vendorId === "string" ? rawQuery.vendorId : "",
    staffId: typeof rawQuery.staffId === "string" ? rawQuery.staffId : "",
    deliveryId: typeof rawQuery.deliveryId === "string" ? rawQuery.deliveryId : "",
    productId: typeof rawQuery.productId === "string" ? rawQuery.productId : "",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const search = await resolveSearchScope(supabase, parsed.q);

  let productReturnIds: string[] | null = null;
  if (parsed.productId) {
    const { data: itemRows, error } = await supabase
      .from("delivery_stock_return_items")
      .select("return_id")
      .eq("product_id", parsed.productId);
    if (error) {
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
    }
    productReturnIds = [...new Set((itemRows ?? []).map((row) => row.return_id))];
  }

  let vendorDeliveryIds: string[] | null = null;
  if (parsed.vendorId) {
    const { data: supplies, error: supplyError } = await supabase
      .from("supplies")
      .select("id")
      .eq("vendor_id", parsed.vendorId);
    if (supplyError) {
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
    }
    const supplyIds = (supplies ?? []).map((row) => row.id);
    if (supplyIds.length === 0) {
      vendorDeliveryIds = [];
    } else {
      const { data: deliveries, error } = await supabase
        .from("deliveries")
        .select("id")
        .in("supply_id", supplyIds);
      if (error) {
        throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
      }
      vendorDeliveryIds = (deliveries ?? []).map((row) => row.id);
    }
  }

  const from = (parsed.page - 1) * RETURNS_PAGE_SIZE;
  const to = from + RETURNS_PAGE_SIZE - 1;

  let listQuery = supabase
    .from("delivery_stock_returns")
    .select(LIST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  listQuery = applyReturnFilters(
    listQuery as never,
    parsed,
    search,
    productReturnIds,
  ) as typeof listQuery;

  if (vendorDeliveryIds) {
    if (vendorDeliveryIds.length === 0) {
      listQuery = listQuery.in("delivery_id", [
        "00000000-0000-0000-0000-000000000000",
      ]);
    } else {
      listQuery = listQuery.in("delivery_id", vendorDeliveryIds);
    }
  }

  const { data, error, count } = await listQuery;
  if (error) {
    throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load returns.");
  }

  const recorderIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.returned_by)
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

  const returns: ReturnListRow[] = (data ?? []).map((row) => {
    const record = row as unknown as DeliveryStockReturnRow & {
      delivery: unknown;
      items?: { quantity: number }[] | null;
    };
    const items = record.items ?? [];
    const { items: _items, ...rest } = record;
    void _items;
    return {
      ...rest,
      delivery: mapDeliverySummary(record.delivery),
      returned_by_name: record.returned_by
        ? recorderNames.get(record.returned_by) ?? null
        : null,
      item_count: items.length,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  });

  return {
    returns,
    total: count ?? 0,
    page: parsed.page,
    pageSize: RETURNS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getReturn(returnId: string): Promise<ReturnDetail> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("delivery_stock_returns")
    .select(
      `
      *,
      delivery:deliveries (
        id,
        delivery_ref,
        status,
        delivery_date,
        supply_id,
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
          )
        ),
        responsible_staff:profiles!deliveries_responsible_staff_id_fkey (
          id,
          full_name,
          email,
          role
        ),
        driver:drivers (
          id,
          driver_code,
          full_name,
          phone
        )
      ),
      items:delivery_stock_return_items (
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
    .eq("id", returnId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "RETURN_LOOKUP_FAILED", "Unable to load that return.");
  }
  if (!data) {
    throw new AppError(404, "RETURN_NOT_FOUND", "Return not found.");
  }

  const row = data as unknown as DeliveryStockReturnRow & {
    delivery: unknown;
    items: ReturnItemDetail[] | null;
  };

  const delivery = mapDeliverySummary(row.delivery);
  const items = (row.items ?? []).map((item) => ({
    ...item,
    product: asSingle(item.product),
  }));

  let supplyItems: ReturnSupplyItemDetail[] = [];
  if (delivery?.supply_id) {
    const { data: supplyItemRows, error: supplyItemsError } = await supabase
      .from("supply_items")
      .select(
        `
        id,
        product_id,
        quantity,
        unit_price,
        line_total,
        product:products (
          id,
          product_code,
          name,
          brand,
          packaging_size,
          unit_of_measure
        )
      `,
      )
      .eq("supply_id", delivery.supply_id);
    if (supplyItemsError) {
      throw new AppError(
        500,
        "RETURN_LOOKUP_FAILED",
        "Unable to load that return.",
      );
    }
    supplyItems = (supplyItemRows ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      product: asSingle(
        item.product as ReturnSupplyItemDetail["product"] | ReturnSupplyItemDetail["product"][] | null,
      ),
    }));
  }

  const { data: movements, error: movementsError } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("reference_type", "delivery_stock_returns")
    .eq("reference_id", returnId)
    .order("created_at", { ascending: true });

  if (movementsError) {
    throw new AppError(500, "RETURN_LOOKUP_FAILED", "Unable to load that return.");
  }

  let returnedByName: string | null = null;
  if (row.returned_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.returned_by)
      .maybeSingle();
    returnedByName = profile?.full_name ?? null;
  }

  return {
    id: row.id,
    return_ref: row.return_ref,
    delivery_id: row.delivery_id,
    returned_by: row.returned_by,
    notes: row.notes,
    client_request_id: row.client_request_id,
    client_request_fingerprint: row.client_request_fingerprint,
    created_at: row.created_at,
    delivery,
    returned_by_name: returnedByName,
    items,
    supply_items: supplyItems,
    stock_movements: (movements ?? []) as StockMovementRow[],
  };
}

export async function listReturnsForDelivery(
  deliveryId: string,
): Promise<
  Array<
    DeliveryStockReturnRow & {
      item_count: number;
      total_quantity: number;
      items: Array<{
        product_id: string;
        quantity: number;
        product_name: string | null;
        product_code: string | null;
      }>;
    }
  >
> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("delivery_stock_returns")
    .select(
      `
      *,
      items:delivery_stock_return_items (
        product_id,
        quantity,
        product:products ( product_code, name )
      )
    `,
    )
    .eq("delivery_id", deliveryId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(
      500,
      "RETURN_LIST_FAILED",
      "Unable to load returns for this delivery.",
    );
  }

  return (data ?? []).map((row) => {
    const itemsRaw = (row.items ?? []) as Array<{
      product_id: string;
      quantity: number;
      product:
        | { product_code: string; name: string }
        | { product_code: string; name: string }[]
        | null;
    }>;
    const items = itemsRaw.map((item) => {
      const product = asSingle(item.product);
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: product?.name ?? null,
        product_code: product?.product_code ?? null,
      };
    });
    return {
      id: row.id,
      return_ref: row.return_ref,
      delivery_id: row.delivery_id,
      returned_by: row.returned_by,
      notes: row.notes,
      client_request_id: row.client_request_id,
      client_request_fingerprint: row.client_request_fingerprint,
      created_at: row.created_at,
      item_count: items.length,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
    };
  });
}

export async function getReturnEligibility(
  deliveryId: string,
): Promise<ReturnEligibility> {
  await requireStaffOrAdmin();
  const supabase = await createClient();

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select(
      `
      id,
      delivery_ref,
      status,
      delivery_date,
      supply_id,
      supply:supplies (
        id,
        supply_ref,
        supply_date,
        vendor:vendors (
          id,
          vendor_code,
          business_name,
          contact_person,
          phone,
          location
        ),
        items:supply_items (
          product_id,
          quantity,
          product:products (
            id,
            product_code,
            name,
            brand,
            unit_of_measure
          )
        )
      )
    `,
    )
    .eq("id", deliveryId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "RETURN_ELIGIBILITY_FAILED",
      "Unable to load return eligibility.",
    );
  }
  if (!delivery) {
    throw new AppError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
  }

  const supply = asSingle(
    delivery.supply as
      | {
          id: string;
          supply_ref: string;
          supply_date: string;
          vendor: ReturnVendorSummary | ReturnVendorSummary[] | null;
          items:
            | Array<{
                product_id: string;
                quantity: number;
                product:
                  | {
                      id: string;
                      product_code: string;
                      name: string;
                      brand: string;
                      unit_of_measure: string;
                    }
                  | {
                      id: string;
                      product_code: string;
                      name: string;
                      brand: string;
                      unit_of_measure: string;
                    }[]
                  | null;
              }>
            | null;
        }
      | {
          id: string;
          supply_ref: string;
          supply_date: string;
          vendor: ReturnVendorSummary | ReturnVendorSummary[] | null;
          items:
            | Array<{
                product_id: string;
                quantity: number;
                product:
                  | {
                      id: string;
                      product_code: string;
                      name: string;
                      brand: string;
                      unit_of_measure: string;
                    }
                  | {
                      id: string;
                      product_code: string;
                      name: string;
                      brand: string;
                      unit_of_measure: string;
                    }[]
                  | null;
              }>
            | null;
        }[]
      | null,
  );

  const { data: returnsForDelivery, error: returnsError } = await supabase
    .from("delivery_stock_returns")
    .select("id")
    .eq("delivery_id", deliveryId);
  if (returnsError) {
    throw new AppError(
      500,
      "RETURN_ELIGIBILITY_FAILED",
      "Unable to load return eligibility.",
    );
  }

  const returnIds = (returnsForDelivery ?? []).map((row) => row.id);
  const alreadyByProduct = new Map<string, number>();
  if (returnIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("delivery_stock_return_items")
      .select("product_id, quantity")
      .in("return_id", returnIds);
    if (itemsError) {
      throw new AppError(
        500,
        "RETURN_ELIGIBILITY_FAILED",
        "Unable to load return eligibility.",
      );
    }
    for (const item of items ?? []) {
      alreadyByProduct.set(
        item.product_id,
        (alreadyByProduct.get(item.product_id) ?? 0) + item.quantity,
      );
    }
  }

  return buildEligibility(delivery, supply, alreadyByProduct);
}

function buildEligibility(
  delivery: {
    id: string;
    delivery_ref: string;
    status: DeliveryStatus;
    delivery_date: string;
    supply_id: string;
  },
  supply: {
    id: string;
    supply_ref: string;
    supply_date: string;
    vendor: ReturnVendorSummary | ReturnVendorSummary[] | null;
    items:
      | Array<{
          product_id: string;
          quantity: number;
          product:
            | {
                id: string;
                product_code: string;
                name: string;
                brand: string;
                unit_of_measure: string;
              }
            | {
                id: string;
                product_code: string;
                name: string;
                brand: string;
                unit_of_measure: string;
              }[]
            | null;
        }>
      | null;
  } | null,
  alreadyByProduct: Map<string, number>,
): ReturnEligibility {
  const canRecord = canRecordReturnForDeliveryStatus(delivery.status);
  const lines: EligibleReturnLine[] = (supply?.items ?? []).map((item) => {
    const product = asSingle(item.product);
    const alreadyReturned = alreadyByProduct.get(item.product_id) ?? 0;
    const remainingQuantity = Math.max(0, item.quantity - alreadyReturned);
    return {
      productId: item.product_id,
      productCode: product?.product_code ?? "—",
      productName: product?.name ?? "Product",
      brand: product?.brand ?? "",
      unitOfMeasure: product?.unit_of_measure ?? "",
      originalQuantity: item.quantity,
      alreadyReturned,
      remainingQuantity,
    };
  });

  return {
    delivery: {
      id: delivery.id,
      delivery_ref: delivery.delivery_ref,
      status: delivery.status,
      delivery_date: delivery.delivery_date,
      supply_id: delivery.supply_id,
    },
    supply: {
      id: supply?.id ?? delivery.supply_id,
      supply_ref: supply?.supply_ref ?? "—",
      supply_date: supply?.supply_date ?? "",
    },
    vendor: supply ? asSingle(supply.vendor) : null,
    canRecord,
    eligibilityMessage: canRecord
      ? "Select products and quantities to restore. The database enforces remaining limits."
      : "Stock returns are only allowed for FAILED or CANCELLED deliveries.",
    lines,
  };
}

function mapReturnableDeliveryOption(row: {
  id: string;
  delivery_ref: string;
  status: DeliveryStatus;
  delivery_date: string;
  supply: unknown;
}): ReturnableDeliveryOption {
  const supply = asSingle(
    row.supply as
      | {
          supply_ref: string;
          vendor: { business_name: string } | { business_name: string }[] | null;
        }
      | {
          supply_ref: string;
          vendor: { business_name: string } | { business_name: string }[] | null;
        }[]
      | null,
  );
  const vendor = supply ? asSingle(supply.vendor) : null;
  return {
    id: row.id,
    delivery_ref: row.delivery_ref,
    status: row.status,
    delivery_date: row.delivery_date,
    supply_ref: supply?.supply_ref ?? null,
    vendor_name: vendor?.business_name ?? null,
  };
}

const DELIVERY_OPTION_SELECT = `
  id,
  delivery_ref,
  status,
  delivery_date,
  supply:supplies (
    supply_ref,
    vendor:vendors ( business_name )
  )
`;

/**
 * Bounded typeahead for FAILED/CANCELLED deliveries eligible for stock returns.
 * Search by delivery ref, supply ref, or vendor — never dumps the full catalog.
 */
export async function searchReturnableDeliveries(input: {
  q?: string;
  limit?: number;
}): Promise<ReturnableDeliveryOption[]> {
  await requireStaffOrAdmin();
  const limit = Math.min(
    Math.max(1, input.limit ?? FILTER_SEARCH_LIMIT),
    FILTER_SEARCH_LIMIT,
  );
  const safe = sanitizeSearch(input.q ?? "");
  const supabase = await createClient();

  let query = supabase
    .from("deliveries")
    .select(DELIVERY_OPTION_SELECT)
    .in("status", ["FAILED", "CANCELLED"])
    .order("delivery_date", { ascending: false })
    .limit(limit);

  if (safe) {
    const term = `%${safe}%`;
    const supplyIds = new Set<string>();

    const { data: vendors, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .or(`business_name.ilike.${term},vendor_code.ilike.${term}`)
      .limit(SEARCH_SCOPE_ID_LIMIT);
    if (vendorError) {
      throw new AppError(
        500,
        "DELIVERY_LIST_FAILED",
        "Unable to search returnable deliveries.",
      );
    }
    const vendorIds = (vendors ?? []).map((row) => row.id);
    if (vendorIds.length > 0) {
      const { data: vendorSupplies, error: vendorSupplyError } = await supabase
        .from("supplies")
        .select("id")
        .in("vendor_id", vendorIds)
        .limit(SEARCH_SCOPE_ID_LIMIT);
      if (vendorSupplyError) {
        throw new AppError(
          500,
          "DELIVERY_LIST_FAILED",
          "Unable to search returnable deliveries.",
        );
      }
      for (const row of vendorSupplies ?? []) supplyIds.add(row.id);
    }

    const { data: suppliesByRef, error: supplyRefError } = await supabase
      .from("supplies")
      .select("id")
      .ilike("supply_ref", term)
      .limit(SEARCH_SCOPE_ID_LIMIT);
    if (supplyRefError) {
      throw new AppError(
        500,
        "DELIVERY_LIST_FAILED",
        "Unable to search returnable deliveries.",
      );
    }
    for (const row of suppliesByRef ?? []) supplyIds.add(row.id);

    if (supplyIds.size > 0) {
      query = query.or(
        `delivery_ref.ilike.${term},supply_id.in.(${[...supplyIds].join(",")})`,
      );
    } else {
      query = query.ilike("delivery_ref", term);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(
      500,
      "DELIVERY_LIST_FAILED",
      "Unable to search returnable deliveries.",
    );
  }

  return (data ?? []).map((row) => mapReturnableDeliveryOption(row));
}

/** Resolve a selected returnable delivery for create-form display. */
export async function resolveReturnableDeliveryOption(
  deliveryId: string,
): Promise<ReturnableDeliveryOption | null> {
  await requireStaffOrAdmin();
  if (!deliveryId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select(DELIVERY_OPTION_SELECT)
    .eq("id", deliveryId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "DELIVERY_LOOKUP_FAILED",
      "Unable to load that delivery.",
    );
  }
  if (!data) return null;
  // Display-only resolve — eligibility still gates recording to FAILED/CANCELLED.
  return mapReturnableDeliveryOption(data);
}

/**
 * Typeahead for deliveries that already have stock returns.
 * Bounded search — never dumps the full returns→delivery catalog.
 */
export async function searchDeliveriesForReturnFilter(input: {
  q?: string;
  limit?: number;
}): Promise<ReturnDeliveryFilterOption[]> {
  await requireStaffOrAdmin();
  const limit = Math.min(
    Math.max(1, input.limit ?? FILTER_SEARCH_LIMIT),
    FILTER_SEARCH_LIMIT,
  );
  const safe = sanitizeSearch(input.q ?? "");
  const supabase = await createClient();

  if (safe) {
    const term = `%${safe}%`;
    const { data: candidates, error: candidateError } = await supabase
      .from("deliveries")
      .select("id, delivery_ref")
      .ilike("delivery_ref", term)
      .order("delivery_date", { ascending: false })
      .limit(limit * 2);
    if (candidateError) {
      throw new AppError(
        500,
        "DELIVERY_LIST_FAILED",
        "Unable to search deliveries.",
      );
    }
    const candidateIds = (candidates ?? []).map((row) => row.id);
    if (candidateIds.length === 0) return [];

    const { data: withReturns, error: returnError } = await supabase
      .from("delivery_stock_returns")
      .select("delivery_id")
      .in("delivery_id", candidateIds);
    if (returnError) {
      throw new AppError(500, "RETURN_LIST_FAILED", "Unable to search deliveries.");
    }
    const allowed = new Set(
      (withReturns ?? []).map((row) => row.delivery_id),
    );
    return (candidates ?? [])
      .filter((row) => allowed.has(row.id))
      .slice(0, limit)
      .map((row) => ({ id: row.id, label: row.delivery_ref }));
  }

  const { data: recentReturns, error: recentError } = await supabase
    .from("delivery_stock_returns")
    .select("delivery_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (recentError) {
    throw new AppError(500, "RETURN_LIST_FAILED", "Unable to load deliveries.");
  }

  const uniqueIds: string[] = [];
  const seen = new Set<string>();
  for (const row of recentReturns ?? []) {
    if (seen.has(row.delivery_id)) continue;
    seen.add(row.delivery_id);
    uniqueIds.push(row.delivery_id);
    if (uniqueIds.length >= limit) break;
  }
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("deliveries")
    .select("id, delivery_ref")
    .in("id", uniqueIds);
  if (error) {
    throw new AppError(
      500,
      "DELIVERY_LIST_FAILED",
      "Unable to load deliveries.",
    );
  }

  const byId = new Map((data ?? []).map((row) => [row.id, row.delivery_ref]));
  return uniqueIds
    .map((id) => {
      const label = byId.get(id);
      return label ? { id, label } : null;
    })
    .filter((row): row is ReturnDeliveryFilterOption => Boolean(row));
}

export async function resolveDeliveryFilterOption(
  deliveryId: string,
): Promise<ReturnDeliveryFilterOption | null> {
  await requireStaffOrAdmin();
  if (!deliveryId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, delivery_ref")
    .eq("id", deliveryId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "DELIVERY_LOOKUP_FAILED",
      "Unable to load that delivery.",
    );
  }
  if (!data) return null;
  return { id: data.id, label: data.delivery_ref };
}

export async function listStaffForReturnFilter(): Promise<ReturnStaffOption[]> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["ADMIN", "STAFF"])
    .order("full_name", { ascending: true })
    .limit(FILTER_OPTION_LIMIT);

  if (error) {
    throw new AppError(500, "STAFF_LIST_FAILED", "Unable to load staff.");
  }

  return (data ?? []) as ReturnStaffOption[];
}

export async function listVendorsForReturnFilter(): Promise<ReturnVendorOption[]> {
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

  return (data ?? []) as ReturnVendorOption[];
}
