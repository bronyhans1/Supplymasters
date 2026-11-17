import "server-only";

import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database, Json } from "@/types/database";
import {
  AUDIT_LOGS_PAGE_SIZE,
  listAuditLogsQuerySchema,
} from "./schemas";
import {
  buildAuditDetailFields,
  formatAuditDateTime,
  formatAuditDescription,
  formatAuditTarget,
  humanizeAuditAction,
  resolveActorLabel,
  type AuditSummaryContext,
} from "./presentation";
import { sanitizeAuditMetadata } from "./sanitize";
import type { AuditLogListItem, ListAuditLogsResult } from "./types";

export { AUDIT_LOGS_PAGE_SIZE };
export type { AuditLogListItem, ListAuditLogsResult };

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

function isUuid(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function endOfDayUtc(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function startOfDayUtc(date: string): string {
  return `${date}T00:00:00.000Z`;
}

async function resolveActorIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorFilter: string,
): Promise<string[] | "none" | "all"> {
  const raw = actorFilter.trim();
  if (!raw) return "all";

  if (isUuid(raw)) {
    return [raw];
  }

  const safe = sanitizeSearch(raw);
  if (!safe) return "none";

  const term = `%${safe}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(50);

  if (error) {
    throw new AppError(500, "AUDIT_ACTOR_LOOKUP_FAILED", "Unable to resolve actor filter.");
  }

  const ids = (data ?? []).map((row) => row.id);
  return ids.length > 0 ? ids : "none";
}

function collectId(
  set: Set<string>,
  value: Json | string | null | undefined,
) {
  if (typeof value === "string") {
    const id = isUuid(value);
    if (id) set.add(id);
  }
}

function metaLabel(value: Json | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listAuditLogs(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListAuditLogsResult> {
  await requireAdmin();

  let parsed;
  try {
    parsed = listAuditLogsQuerySchema.parse({
      q: typeof rawQuery.q === "string" ? rawQuery.q : "",
      action: typeof rawQuery.action === "string" ? rawQuery.action : "",
      entityType: typeof rawQuery.entityType === "string" ? rawQuery.entityType : "",
      actor: typeof rawQuery.actor === "string" ? rawQuery.actor : "",
      entityId: typeof rawQuery.entityId === "string" ? rawQuery.entityId : "",
      fromDate: typeof rawQuery.fromDate === "string" ? rawQuery.fromDate : "",
      toDate: typeof rawQuery.toDate === "string" ? rawQuery.toDate : "",
      page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        400,
        "AUDIT_QUERY_INVALID",
        error.issues[0]?.message ?? "Invalid audit log filters.",
      );
    }
    throw error;
  }

  const supabase = await createClient();
  const actorIds = await resolveActorIds(supabase, parsed.actor);

  if (actorIds === "none") {
    return {
      rows: [],
      total: 0,
      page: parsed.page,
      pageSize: AUDIT_LOGS_PAGE_SIZE,
      query: parsed,
    };
  }

  const from = (parsed.page - 1) * AUDIT_LOGS_PAGE_SIZE;
  const to = from + AUDIT_LOGS_PAGE_SIZE - 1;

  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (parsed.action) {
    query = query.eq("action", parsed.action);
  }
  if (parsed.entityType) {
    query = query.eq("entity_type", parsed.entityType);
  }
  if (parsed.entityId) {
    query = query.eq("entity_id", parsed.entityId);
  }
  if (parsed.fromDate) {
    query = query.gte("created_at", startOfDayUtc(parsed.fromDate));
  }
  if (parsed.toDate) {
    query = query.lte("created_at", endOfDayUtc(parsed.toDate));
  }
  if (actorIds !== "all") {
    query = query.in("actor_id", actorIds);
  }

  const safeQ = sanitizeSearch(parsed.q);
  if (safeQ) {
    const term = `%${safeQ}%`;
    query = query.or(
      [
        `action.ilike.${term}`,
        `entity_type.ilike.${term}`,
        `metadata->>code.ilike.${term}`,
        `metadata->>name.ilike.${term}`,
        `metadata->>business_name.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "AUDIT_LIST_FAILED", "Unable to load audit logs.");
  }

  const rows = (data ?? []) as AuditLogRow[];
  const uniqueActorIds = [
    ...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
  ];

  const productIds = new Set<string>();
  const vendorIds = new Set<string>();
  const supplierIds = new Set<string>();
  const driverIds = new Set<string>();
  const supplyIds = new Set<string>();
  const paymentIds = new Set<string>();
  const purchaseIds = new Set<string>();
  const deliveryIds = new Set<string>();
  const profileEntityIds = new Set<string>();

  const sanitizedByRowId = new Map<string, Record<string, Json>>();
  for (const row of rows) {
    const sanitizedMetadata = sanitizeAuditMetadata(row.metadata);
    sanitizedByRowId.set(row.id, sanitizedMetadata);

    const hasProductLabel = Boolean(
      metaLabel(sanitizedMetadata.name) || metaLabel(sanitizedMetadata.brand),
    );
    const hasVendorLabel = Boolean(
      metaLabel(sanitizedMetadata.business_name) ||
        (row.entity_type === "vendors" && metaLabel(sanitizedMetadata.name)),
    );
    const hasSupplierLabel = Boolean(
      row.entity_type === "stock_suppliers" || row.entity_type === "suppliers"
        ? metaLabel(sanitizedMetadata.name)
        : false,
    );
    const hasDriverLabel = Boolean(
      metaLabel(sanitizedMetadata.name) ||
        metaLabel(sanitizedMetadata.new_driver_name) ||
        metaLabel(sanitizedMetadata.previous_driver_name),
    );
    const hasDeliveryRef = Boolean(metaLabel(sanitizedMetadata.delivery_ref));

    // Only enqueue DB lookups when sanitized metadata lacks usable labels.
    if (!hasProductLabel) collectId(productIds, sanitizedMetadata.product_id);
    if (!hasVendorLabel) collectId(vendorIds, sanitizedMetadata.vendor_id);
    if (!hasSupplierLabel) collectId(supplierIds, sanitizedMetadata.supplier_id);
    if (!hasDriverLabel) collectId(driverIds, sanitizedMetadata.driver_id);
    collectId(supplyIds, sanitizedMetadata.supply_id);
    collectId(paymentIds, sanitizedMetadata.payment_id);
    collectId(purchaseIds, sanitizedMetadata.purchase_id);
    if (!hasDeliveryRef) collectId(deliveryIds, sanitizedMetadata.delivery_id);

    const entityId = row.entity_id ? isUuid(row.entity_id) : null;
    if (entityId) {
      switch (row.entity_type) {
        case "products":
          if (!hasProductLabel) productIds.add(entityId);
          break;
        case "vendors":
          if (!hasVendorLabel) vendorIds.add(entityId);
          break;
        case "stock_suppliers":
        case "suppliers":
          if (!hasSupplierLabel) supplierIds.add(entityId);
          break;
        case "drivers":
          if (!hasDriverLabel) driverIds.add(entityId);
          break;
        case "supplies":
          supplyIds.add(entityId);
          break;
        case "payments":
          paymentIds.add(entityId);
          break;
        case "stock_purchases":
          purchaseIds.add(entityId);
          break;
        case "deliveries":
          if (!hasDeliveryRef) deliveryIds.add(entityId);
          break;
        case "profiles":
          profileEntityIds.add(entityId);
          break;
        default:
          break;
      }
    }
  }

  const actorNameById = new Map<string, string>();
  const productById = new Map<string, { name: string; code: string }>();
  const vendorById = new Map<string, { name: string; code: string }>();
  const supplierNameById = new Map<string, string>();
  const driverNameById = new Map<string, string>();
  const supplyById = new Map<string, { ref: string; vendorId: string | null }>();
  const paymentById = new Map<string, { ref: string; vendorId: string | null }>();
  const purchaseById = new Map<
    string,
    { ref: string; supplierId: string | null }
  >();
  const deliveryRefById = new Map<string, string>();
  const profileNameById = new Map<string, string>();

  const [
    profilesResult,
    productsResult,
    vendorsResult,
    suppliersResult,
    driversResult,
    suppliesResult,
    paymentsResult,
    purchasesResult,
    deliveriesResult,
    profileEntitiesResult,
  ] = await Promise.all([
    uniqueActorIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", uniqueActorIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.size > 0
      ? supabase
          .from("products")
          .select("id, name, product_code")
          .in("id", [...productIds])
      : Promise.resolve({ data: [], error: null }),
    vendorIds.size > 0
      ? supabase
          .from("vendors")
          .select("id, business_name, vendor_code")
          .in("id", [...vendorIds])
      : Promise.resolve({ data: [], error: null }),
    supplierIds.size > 0
      ? supabase.from("stock_suppliers").select("id, name").in("id", [...supplierIds])
      : Promise.resolve({ data: [], error: null }),
    driverIds.size > 0
      ? supabase.from("drivers").select("id, full_name").in("id", [...driverIds])
      : Promise.resolve({ data: [], error: null }),
    supplyIds.size > 0
      ? supabase
          .from("supplies")
          .select("id, supply_ref, vendor_id")
          .in("id", [...supplyIds])
      : Promise.resolve({ data: [], error: null }),
    paymentIds.size > 0
      ? supabase
          .from("payments")
          .select("id, payment_ref, vendor_id")
          .in("id", [...paymentIds])
      : Promise.resolve({ data: [], error: null }),
    purchaseIds.size > 0
      ? supabase
          .from("stock_purchases")
          .select("id, purchase_ref, supplier_id")
          .in("id", [...purchaseIds])
      : Promise.resolve({ data: [], error: null }),
    deliveryIds.size > 0
      ? supabase
          .from("deliveries")
          .select("id, delivery_ref")
          .in("id", [...deliveryIds])
      : Promise.resolve({ data: [], error: null }),
    profileEntityIds.size > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...profileEntityIds])
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new AppError(500, "AUDIT_ACTOR_LOOKUP_FAILED", "Unable to load actor identities.");
  }
  if (
    productsResult.error ||
    vendorsResult.error ||
    suppliersResult.error ||
    driversResult.error ||
    suppliesResult.error ||
    paymentsResult.error ||
    purchasesResult.error ||
    deliveriesResult.error ||
    profileEntitiesResult.error
  ) {
    throw new AppError(
      500,
      "AUDIT_ENTITY_LOOKUP_FAILED",
      "Unable to resolve related business identities.",
    );
  }

  for (const profile of profilesResult.data ?? []) {
    actorNameById.set(profile.id, profile.full_name);
  }
  for (const product of productsResult.data ?? []) {
    productById.set(product.id, {
      name: product.name,
      code: product.product_code,
    });
  }
  for (const vendor of vendorsResult.data ?? []) {
    vendorById.set(vendor.id, {
      name: vendor.business_name,
      code: vendor.vendor_code,
    });
  }
  for (const supplier of suppliersResult.data ?? []) {
    supplierNameById.set(supplier.id, supplier.name);
  }
  for (const driver of driversResult.data ?? []) {
    driverNameById.set(driver.id, driver.full_name);
  }
  for (const supply of suppliesResult.data ?? []) {
    supplyById.set(supply.id, {
      ref: supply.supply_ref,
      vendorId: supply.vendor_id,
    });
    collectId(vendorIds, supply.vendor_id);
  }
  for (const payment of paymentsResult.data ?? []) {
    paymentById.set(payment.id, {
      ref: payment.payment_ref,
      vendorId: payment.vendor_id,
    });
    collectId(vendorIds, payment.vendor_id);
  }
  for (const purchase of purchasesResult.data ?? []) {
    purchaseById.set(purchase.id, {
      ref: purchase.purchase_ref,
      supplierId: purchase.supplier_id,
    });
    collectId(supplierIds, purchase.supplier_id);
  }
  for (const delivery of deliveriesResult.data ?? []) {
    deliveryRefById.set(delivery.id, delivery.delivery_ref);
  }
  for (const profile of profileEntitiesResult.data ?? []) {
    profileNameById.set(profile.id, profile.full_name);
  }

  // Second-pass vendor/supplier fills for supply/payment/purchase links discovered above.
  const missingVendorIds = [...vendorIds].filter((id) => !vendorById.has(id));
  const missingSupplierIds = [...supplierIds].filter(
    (id) => !supplierNameById.has(id),
  );
  if (missingVendorIds.length > 0 || missingSupplierIds.length > 0) {
    const [extraVendors, extraSuppliers] = await Promise.all([
      missingVendorIds.length > 0
        ? supabase
            .from("vendors")
            .select("id, business_name, vendor_code")
            .in("id", missingVendorIds)
        : Promise.resolve({ data: [], error: null }),
      missingSupplierIds.length > 0
        ? supabase
            .from("stock_suppliers")
            .select("id, name")
            .in("id", missingSupplierIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (extraVendors.error || extraSuppliers.error) {
      throw new AppError(
        500,
        "AUDIT_ENTITY_LOOKUP_FAILED",
        "Unable to resolve related business identities.",
      );
    }
    for (const vendor of extraVendors.data ?? []) {
      vendorById.set(vendor.id, {
        name: vendor.business_name,
        code: vendor.vendor_code,
      });
    }
    for (const supplier of extraSuppliers.data ?? []) {
      supplierNameById.set(supplier.id, supplier.name);
    }
  }

  return {
    rows: rows.map((row) => {
      const sanitizedMetadata = sanitizedByRowId.get(row.id) ?? {};
      const entityId = row.entity_id ? isUuid(row.entity_id) : null;

      const metaProductId =
        typeof sanitizedMetadata.product_id === "string"
          ? isUuid(sanitizedMetadata.product_id)
          : row.entity_type === "products"
            ? entityId
            : null;
      const metaVendorId =
        typeof sanitizedMetadata.vendor_id === "string"
          ? isUuid(sanitizedMetadata.vendor_id)
          : row.entity_type === "vendors"
            ? entityId
            : null;
      const metaSupplierId =
        typeof sanitizedMetadata.supplier_id === "string"
          ? isUuid(sanitizedMetadata.supplier_id)
          : row.entity_type === "stock_suppliers" || row.entity_type === "suppliers"
            ? entityId
            : null;
      const metaDriverId =
        typeof sanitizedMetadata.driver_id === "string"
          ? isUuid(sanitizedMetadata.driver_id)
          : row.entity_type === "drivers"
            ? entityId
            : null;
      const metaSupplyId =
        typeof sanitizedMetadata.supply_id === "string"
          ? isUuid(sanitizedMetadata.supply_id)
          : row.entity_type === "supplies"
            ? entityId
            : null;
      const metaPaymentId =
        typeof sanitizedMetadata.payment_id === "string"
          ? isUuid(sanitizedMetadata.payment_id)
          : row.entity_type === "payments"
            ? entityId
            : null;
      const metaPurchaseId =
        typeof sanitizedMetadata.purchase_id === "string"
          ? isUuid(sanitizedMetadata.purchase_id)
          : row.entity_type === "stock_purchases"
            ? entityId
            : null;
      const metaDeliveryId =
        typeof sanitizedMetadata.delivery_id === "string"
          ? isUuid(sanitizedMetadata.delivery_id)
          : row.entity_type === "deliveries"
            ? entityId
            : null;

      const supply = metaSupplyId ? supplyById.get(metaSupplyId) : undefined;
      const payment = metaPaymentId ? paymentById.get(metaPaymentId) : undefined;
      const purchase = metaPurchaseId
        ? purchaseById.get(metaPurchaseId)
        : undefined;

      const resolvedVendorId =
        metaVendorId ?? supply?.vendorId ?? payment?.vendorId ?? null;
      const resolvedSupplierId = metaSupplierId ?? purchase?.supplierId ?? null;
      const product = metaProductId ? productById.get(metaProductId) : undefined;
      const vendor = resolvedVendorId
        ? vendorById.get(resolvedVendorId)
        : undefined;

      const context: AuditSummaryContext = {
        productName:
          product?.name ??
          metaLabel(sanitizedMetadata.name) ??
          metaLabel(sanitizedMetadata.brand),
        productCode:
          product?.code ?? metaLabel(sanitizedMetadata.code),
        vendorName:
          vendor?.name ??
          metaLabel(sanitizedMetadata.business_name) ??
          (row.entity_type === "vendors"
            ? metaLabel(sanitizedMetadata.name)
            : null),
        vendorCode:
          vendor?.code ??
          (row.entity_type === "vendors"
            ? metaLabel(sanitizedMetadata.code)
            : null),
        supplierName:
          (resolvedSupplierId
            ? supplierNameById.get(resolvedSupplierId) ?? null
            : null) ??
          (row.entity_type === "stock_suppliers" ||
          row.entity_type === "suppliers"
            ? metaLabel(sanitizedMetadata.name)
            : null),
        driverName:
          (metaDriverId ? driverNameById.get(metaDriverId) ?? null : null) ??
          metaLabel(sanitizedMetadata.new_driver_name) ??
          metaLabel(sanitizedMetadata.name),
        supplyRef: supply?.ref ?? null,
        paymentRef: payment?.ref ?? null,
        purchaseRef: purchase?.ref ?? null,
        deliveryRef:
          metaLabel(sanitizedMetadata.delivery_ref) ??
          (metaDeliveryId ? deliveryRefById.get(metaDeliveryId) ?? null : null),
        profileName:
          row.entity_type === "profiles" && entityId
            ? profileNameById.get(entityId) ?? null
            : null,
      };

      const actorLabel = resolveActorLabel({
        actorId: row.actor_id,
        fullName: row.actor_id ? actorNameById.get(row.actor_id) ?? null : null,
      });
      const actionLabel = humanizeAuditAction(row.action);
      const targetLabel = formatAuditTarget(
        row.action,
        row.entity_type,
        sanitizedMetadata,
        context,
      );
      const description = formatAuditDescription(
        row.action,
        sanitizedMetadata,
        context,
      );
      const createdAtLabel = formatAuditDateTime(row.created_at);

      return {
        rowKey: row.id,
        actionLabel,
        actorLabel,
        createdAt: row.created_at,
        createdAtLabel,
        targetLabel,
        description,
        detailFields: buildAuditDetailFields({
          action: row.action,
          actorLabel,
          createdAtLabel,
          targetLabel,
          description,
          sanitized: sanitizedMetadata,
          context,
        }),
      } satisfies AuditLogListItem;
    }),
    total: count ?? 0,
    page: parsed.page,
    pageSize: AUDIT_LOGS_PAGE_SIZE,
    query: parsed,
  };
}
