import type { Json, PaymentMethod } from "@/types/database";
import { paymentMethodLabel } from "@/lib/payments/presentation";
import { formatGhs } from "@/lib/supplies/money";

function formatPaymentMethod(value: string): string {
  return paymentMethodLabel(value as PaymentMethod);
}

export type AuditSummaryContext = {
  productName?: string | null;
  productCode?: string | null;
  vendorName?: string | null;
  vendorCode?: string | null;
  supplierName?: string | null;
  driverName?: string | null;
  supplyRef?: string | null;
  paymentRef?: string | null;
  purchaseRef?: string | null;
  deliveryRef?: string | null;
  profileName?: string | null;
};

export type AuditDetailField = {
  label: string;
  value: string;
};

/** Central action presentation map for the management console. */
const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: "Product created",
  PRODUCT_UPDATED: "Product updated",
  PRODUCT_ACTIVATED: "Product activated",
  PRODUCT_DEACTIVATED: "Product deactivated",
  PRODUCT_CATEGORY_CREATED: "Product category created",
  PRODUCT_CATEGORY_UPDATED: "Product category updated",
  PRODUCT_CATEGORY_ACTIVATED: "Product category activated",
  PRODUCT_CATEGORY_DEACTIVATED: "Product category deactivated",
  VENDOR_CREATED: "Vendor registered",
  VENDOR_UPDATED: "Vendor updated",
  VENDOR_ACTIVATED: "Vendor activated",
  VENDOR_DEACTIVATED: "Vendor deactivated",
  STOCK_SUPPLIER_CREATED: "Stock supplier created",
  STOCK_SUPPLIER_UPDATED: "Stock supplier updated",
  STOCK_SUPPLIER_ACTIVATED: "Stock supplier activated",
  STOCK_SUPPLIER_DEACTIVATED: "Stock supplier deactivated",
  DRIVER_CREATED: "Driver registered",
  DRIVER_UPDATED: "Driver updated",
  DRIVER_ACTIVATED: "Driver activated",
  DRIVER_DEACTIVATED: "Driver deactivated",
  STOCK_MOVEMENT_RECORDED: "Stock movement recorded",
  SUPPLY_CREATED: "Wholesale supply recorded",
  PAYMENT_RECORDED: "Payment recorded",
  STOCK_PURCHASE_RECEIVED: "Stock purchase received",
  DELIVERY_ASSIGNED: "Delivery assigned",
  DELIVERY_DRIVER_SET: "Delivery driver assignment updated",
  DELIVERY_STAFF_SET: "Delivery staff assignment updated",
  DELIVERY_STATUS_UPDATED: "Delivery status updated",
  DELIVERY_STOCK_RETURNED: "Stock returned from delivery",
  USER_PROVISIONED: "User provisioned",
  FIRST_ADMIN_BOOTSTRAPPED: "First administrator bootstrapped",
  USER_ROLE_UPDATED: "User role updated",
  PROFILE_REPAIRED: "Profile repaired",
  PROFILE_EMAIL_SYNCED: "Profile email synced",
  PASSWORD_CHANGE_REQUIRED: "Password change required",
  PASSWORD_CHANGE_COMPLETED: "Password change completed",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  products: "Product",
  product_categories: "Product category",
  vendors: "Vendor",
  stock_suppliers: "Stock supplier",
  drivers: "Driver",
  stock_movements: "Stock movement",
  supplies: "Supply",
  payments: "Payment",
  stock_purchases: "Stock purchase",
  deliveries: "Delivery",
  delivery_stock_returns: "Delivery stock return",
  profiles: "User",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Stock purchase",
  SUPPLY: "Wholesale supply",
  ADJUSTMENT: "Stock adjustment",
  DELIVERY_RETURN: "Delivery stock return",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  ASSIGNED: "Assigned",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Sentence-case fallback for unknown SCREAMING_SNAKE / snake_case tokens. */
export function humanizeToken(value: string): string {
  const words = value
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

export function humanizeAuditAction(action: string): string {
  const key = action.trim();
  if (!key) return "";
  return ACTION_LABELS[key] ?? humanizeToken(key);
}

export function humanizeAuditEntityType(entityType: string): string {
  const key = entityType.trim();
  if (!key) return "";
  return ENTITY_TYPE_LABELS[key] ?? humanizeToken(key);
}

export function humanizeMovementType(movementType: string): string {
  const key = movementType.trim();
  if (!key) return "";
  return MOVEMENT_TYPE_LABELS[key] ?? humanizeToken(key);
}

export function humanizeStatus(status: string): string {
  const key = status.trim();
  if (!key) return "";
  return STATUS_LABELS[key] ?? humanizeToken(key);
}

export function resolveActorLabel(input: {
  actorId: string | null;
  fullName?: string | null;
}): string {
  if (!input.actorId) return "System";
  const name = input.fullName?.trim();
  if (name && !looksLikeUuid(name)) return name;
  return "Unknown user";
}

function asNonEmptyString(value: Json | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || looksLikeUuid(trimmed)) return null;
  return trimmed;
}

function asFiniteNumber(value: Json | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function unitLabel(count: number): string {
  return Math.abs(count) === 1 ? "unit" : "units";
}

function joinLines(lines: Array<string | null | undefined>): string {
  return lines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean)
    .join("\n");
}

function namedWithCode(name: string | null, code: string | null): string | null {
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  return null;
}

export function formatProductDisplayName(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext = {},
): string | null {
  const code =
    asNonEmptyString(sanitized.code) ??
    (context.productCode?.trim() || null);
  const name =
    asNonEmptyString(sanitized.name) ??
    asNonEmptyString(sanitized.brand) ??
    (context.productName?.trim() || null);
  return namedWithCode(name, code);
}

export function formatAuditTarget(
  action: string,
  entityType: string,
  sanitized: Record<string, Json>,
  context: AuditSummaryContext = {},
): string {
  void action;
  const product = formatProductDisplayName(sanitized, context);
  const vendor = namedWithCode(
    context.vendorName?.trim() ||
      asNonEmptyString(sanitized.business_name) ||
      asNonEmptyString(sanitized.name),
    context.vendorCode?.trim() || asNonEmptyString(sanitized.code),
  );
  const supplier = context.supplierName?.trim() || null;
  const driver = context.driverName?.trim() || asNonEmptyString(sanitized.name);
  const supplyRef = context.supplyRef?.trim() || null;
  const paymentRef = context.paymentRef?.trim() || null;
  const purchaseRef = context.purchaseRef?.trim() || null;
  const deliveryRef = context.deliveryRef?.trim() || null;
  const profileName = context.profileName?.trim() || null;

  switch (entityType) {
    case "products":
      return product ?? "Product";
    case "vendors":
      return vendor ?? "Vendor";
    case "stock_suppliers":
      return supplier ?? asNonEmptyString(sanitized.name) ?? "Stock supplier";
    case "drivers":
      return driver ?? "Driver";
    case "stock_movements":
      return product ?? "Stock movement";
    case "supplies": {
      if (vendor && supplyRef) return `${vendor} · ${supplyRef}`;
      if (vendor) return vendor;
      if (supplyRef) return supplyRef;
      return "Supply";
    }
    case "payments": {
      if (vendor && paymentRef) return `${vendor} · ${paymentRef}`;
      if (paymentRef) return paymentRef;
      if (vendor) return vendor;
      return "Payment";
    }
    case "stock_purchases": {
      if (supplier && purchaseRef) return `${supplier} · ${purchaseRef}`;
      if (supplier) return supplier;
      if (purchaseRef) return purchaseRef;
      return "Stock purchase";
    }
    case "deliveries":
      return deliveryRef ?? "Delivery";
    case "delivery_stock_returns":
      return deliveryRef ? `Return · ${deliveryRef}` : "Delivery stock return";
    case "profiles":
      return profileName ?? "User";
    default:
      return (
        product ??
        vendor ??
        supplier ??
        driver ??
        supplyRef ??
        paymentRef ??
        purchaseRef ??
        deliveryRef ??
        profileName ??
        humanizeAuditEntityType(entityType) ??
        "Record"
      );
  }
}

function formatStockMovementDescription(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const product =
    context.productName?.trim() ||
    asNonEmptyString(sanitized.name) ||
    asNonEmptyString(sanitized.brand) ||
    formatProductDisplayName(sanitized, context);
  const delta = asFiniteNumber(sanitized.quantity_delta);
  const after = asFiniteNumber(sanitized.quantity_after);
  const before =
    delta !== null && after !== null ? after - delta : null;
  const movementType = asNonEmptyString(sanitized.movement_type);

  const lines: Array<string | null> = [product];

  if (delta !== null) {
    const signed = delta > 0 ? `+${delta}` : `${delta}`;
    lines.push(`${signed} ${unitLabel(delta)}`);
  }

  if (delta !== null && before !== null && after !== null) {
    if (delta > 0) {
      lines.push(
        `Stock increased from ${before} to ${after} ${unitLabel(after)}`,
      );
    } else if (delta < 0) {
      lines.push(
        `Stock decreased from ${before} to ${after} ${unitLabel(after)}`,
      );
    } else {
      lines.push(`No stock change · ${after} ${unitLabel(after)} on hand`);
    }
  } else if (delta !== null && after !== null) {
    if (delta > 0) {
      lines.push(`Stock increased to ${after} ${unitLabel(after)}`);
    } else if (delta < 0) {
      lines.push(`Stock decreased to ${after} ${unitLabel(after)}`);
    } else {
      lines.push(`No stock change · ${after} ${unitLabel(after)} on hand`);
    }
  } else if (after !== null) {
    lines.push(`Stock on hand: ${after} ${unitLabel(after)}`);
  }

  if (movementType) {
    lines.push(`Reason: ${humanizeMovementType(movementType)}`);
  }

  return joinLines(lines);
}

function formatStockPurchaseDescription(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const supplier = context.supplierName?.trim() || null;
  const itemCount = asFiniteNumber(sanitized.item_count);
  const totalCost = asFiniteNumber(sanitized.total_cost);
  return joinLines([
    supplier ? `Supplier: ${supplier}` : null,
    itemCount !== null
      ? `${itemCount} ${itemCount === 1 ? "product" : "products"}`
      : null,
    totalCost !== null ? `Total: ${formatGhs(totalCost)}` : null,
  ]);
}

function formatSupplyDescription(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const vendor =
    context.vendorName?.trim() ||
    asNonEmptyString(sanitized.business_name) ||
    asNonEmptyString(sanitized.name);
  const itemCount = asFiniteNumber(sanitized.item_count);
  const quantity = asFiniteNumber(sanitized.quantity);
  const grandTotal = asFiniteNumber(sanitized.grand_total);
  const paymentMethod = asNonEmptyString(sanitized.payment_method);
  return joinLines([
    vendor ? `Vendor: ${vendor}` : null,
    itemCount !== null
      ? `${itemCount} ${itemCount === 1 ? "product" : "products"}`
      : quantity !== null
        ? `${quantity} ${unitLabel(quantity)}`
        : null,
    grandTotal !== null ? `Total: ${formatGhs(grandTotal)}` : null,
    paymentMethod ? `Payment: ${formatPaymentMethod(paymentMethod)}` : null,
    "Supply successfully recorded",
  ]);
}

function formatPaymentDescription(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const vendor =
    context.vendorName?.trim() || asNonEmptyString(sanitized.business_name);
  const amount =
    asFiniteNumber(sanitized.amount) ?? asFiniteNumber(sanitized.total_cost);
  const paymentMethod = asNonEmptyString(sanitized.payment_method);
  const paymentRef = context.paymentRef?.trim() || null;
  return joinLines([
    vendor ? `Vendor: ${vendor}` : null,
    paymentRef ? `Reference: ${paymentRef}` : null,
    amount !== null ? `Amount: ${formatGhs(amount)}` : null,
    paymentMethod ? `Method: ${formatPaymentMethod(paymentMethod)}` : null,
    "Payment successfully recorded",
  ]);
}

function formatVendorCreatedDescription(
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const vendor =
    namedWithCode(
      context.vendorName?.trim() ||
        asNonEmptyString(sanitized.business_name) ||
        asNonEmptyString(sanitized.name),
      context.vendorCode?.trim() || asNonEmptyString(sanitized.code),
    ) ?? null;
  return joinLines([vendor, "Vendor successfully registered"]);
}

function formatDeliveryStatusDescription(
  sanitized: Record<string, Json>,
): string {
  const fromStatus = asNonEmptyString(
    sanitized.from_status ?? sanitized.previous_status ?? sanitized.old_status,
  );
  const toStatus = asNonEmptyString(
    sanitized.to_status ?? sanitized.new_status ?? sanitized.status,
  );
  if (fromStatus && toStatus) {
    return `Delivery status changed from ${humanizeStatus(fromStatus)} to ${humanizeStatus(toStatus)}`;
  }
  if (toStatus) {
    return `Delivery status updated to ${humanizeStatus(toStatus)}`;
  }
  return "";
}

function namedAssignmentParty(
  name: string | null,
  code: string | null,
): string | null {
  return namedWithCode(name, code);
}

/** Human description for Phase C enriched assignment audits (+ legacy thin rows). */
export function formatDeliveryAssignmentDescription(
  action: string,
  sanitized: Record<string, Json>,
): string {
  const kind = asNonEmptyString(sanitized.change_kind);
  const deliveryRef = asNonEmptyString(sanitized.delivery_ref);

  if (action === "DELIVERY_DRIVER_SET") {
    const previous = namedAssignmentParty(
      asNonEmptyString(sanitized.previous_driver_name),
      asNonEmptyString(sanitized.previous_driver_code),
    );
    const next = namedAssignmentParty(
      asNonEmptyString(sanitized.new_driver_name),
      asNonEmptyString(sanitized.new_driver_code),
    );

    let core = "";
    if (kind === "DRIVER_CLEARED") {
      core = previous
        ? `Operational driver cleared (was ${previous})`
        : "Operational driver cleared";
    } else if (kind === "DRIVER_CHANGED" && previous && next) {
      core = `Operational driver changed from ${previous} to ${next}`;
    } else if (kind === "DRIVER_ASSIGNED" && next) {
      core = `Operational driver assigned: ${next}`;
    } else if (next && previous) {
      core = `Operational driver changed from ${previous} to ${next}`;
    } else if (next) {
      core = `Operational driver assigned: ${next}`;
    } else if (
      sanitized.driver_id === null ||
      sanitized.new_driver_id === null
    ) {
      core = "Operational driver cleared";
    } else {
      core = "Delivery driver assignment updated";
    }

    return deliveryRef ? `${core} · ${deliveryRef}` : core;
  }

  if (action === "DELIVERY_STAFF_SET") {
    const previous = asNonEmptyString(sanitized.previous_staff_name);
    const next = asNonEmptyString(sanitized.new_staff_name);

    let core = "";
    if (kind === "STAFF_CHANGED" && previous && next) {
      core = `Responsible staff changed from ${previous} to ${next}`;
    } else if (kind === "STAFF_ASSIGNED" && next) {
      core = `Responsible staff assigned: ${next}`;
    } else if (previous && next) {
      core = `Responsible staff changed from ${previous} to ${next}`;
    } else if (next) {
      core = `Responsible staff assigned: ${next}`;
    } else {
      core = "Delivery staff assignment updated";
    }

    return deliveryRef ? `${core} · ${deliveryRef}` : core;
  }

  return "";
}

function formatGenericDescription(
  action: string,
  sanitized: Record<string, Json>,
  context: AuditSummaryContext,
): string {
  const lines: Array<string | null> = [];
  const targetHint =
    formatProductDisplayName(sanitized, context) ||
    namedWithCode(
      context.vendorName?.trim() || asNonEmptyString(sanitized.business_name),
      context.vendorCode?.trim() || asNonEmptyString(sanitized.code),
    ) ||
    context.supplierName?.trim() ||
    context.driverName?.trim() ||
    context.profileName?.trim() ||
    asNonEmptyString(sanitized.name);

  if (targetHint) lines.push(targetHint);

  const fromStatus = asNonEmptyString(
    sanitized.from_status ?? sanitized.previous_status ?? sanitized.old_status,
  );
  const toStatus = asNonEmptyString(
    sanitized.to_status ?? sanitized.new_status ?? sanitized.status,
  );
  if (fromStatus && toStatus) {
    lines.push(
      `Status changed from ${humanizeStatus(fromStatus)} to ${humanizeStatus(toStatus)}`,
    );
  } else if (toStatus) {
    lines.push(`Status: ${humanizeStatus(toStatus)}`);
  }

  const fromRole = asNonEmptyString(
    sanitized.from_role ?? sanitized.previous_role ?? sanitized.old_role,
  );
  const toRole = asNonEmptyString(
    sanitized.to_role ?? sanitized.new_role ?? sanitized.role,
  );
  if (fromRole && toRole) lines.push(`Role changed from ${fromRole} to ${toRole}`);
  else if (toRole) lines.push(`Role: ${toRole}`);

  if (typeof sanitized.is_active === "boolean") {
    lines.push(sanitized.is_active ? "Marked active" : "Marked inactive");
  }

  const itemCount = asFiniteNumber(sanitized.item_count);
  const totalCost = asFiniteNumber(sanitized.total_cost);
  const quantity = asFiniteNumber(sanitized.quantity);
  if (itemCount !== null) {
    lines.push(`${itemCount} ${itemCount === 1 ? "product" : "products"}`);
  }
  if (quantity !== null) lines.push(`${quantity} ${unitLabel(quantity)}`);
  if (totalCost !== null) lines.push(`Total: ${formatGhs(totalCost)}`);

  if (lines.length === 0) {
    return `${humanizeAuditAction(action)} successfully completed`;
  }
  return joinLines(lines);
}

/** Business description for the Description column. */
export function formatAuditDescription(
  action: string,
  sanitized: Record<string, Json>,
  context: AuditSummaryContext = {},
): string {
  switch (action.trim()) {
    case "STOCK_MOVEMENT_RECORDED":
      return formatStockMovementDescription(sanitized, context);
    case "STOCK_PURCHASE_RECEIVED":
      return formatStockPurchaseDescription(sanitized, context);
    case "SUPPLY_CREATED":
      return formatSupplyDescription(sanitized, context);
    case "PAYMENT_RECORDED":
      return formatPaymentDescription(sanitized, context);
    case "VENDOR_CREATED":
      return formatVendorCreatedDescription(sanitized, context);
    case "DELIVERY_STATUS_UPDATED":
      return formatDeliveryStatusDescription(sanitized);
    case "DELIVERY_DRIVER_SET":
    case "DELIVERY_STAFF_SET": {
      const assignment = formatDeliveryAssignmentDescription(action, sanitized);
      return assignment || formatGenericDescription(action, sanitized, context);
    }
    default:
      return formatGenericDescription(action, sanitized, context);
  }
}

/** @deprecated Prefer formatAuditDescription — kept for older call sites/tests. */
export function formatAuditEventSummary(
  action: string,
  sanitized: Record<string, Json>,
  context: AuditSummaryContext = {},
): string {
  return formatAuditDescription(action, sanitized, context);
}

function pushDetail(
  fields: AuditDetailField[],
  label: string,
  value: string | null | undefined,
) {
  const text = value?.trim();
  if (!text || looksLikeUuid(text)) return;
  fields.push({ label, value: text });
}

/** Friendly detail fields for the details panel — no raw keys, JSON, or UUIDs. */
export function buildAuditDetailFields(input: {
  action: string;
  actorLabel: string;
  createdAtLabel: string;
  targetLabel: string;
  description: string;
  sanitized: Record<string, Json>;
  context?: AuditSummaryContext;
}): AuditDetailField[] {
  const sanitized = input.sanitized;
  const context = input.context ?? {};
  const fields: AuditDetailField[] = [];

  pushDetail(fields, "Activity", humanizeAuditAction(input.action));
  pushDetail(fields, "Actor", input.actorLabel);
  pushDetail(fields, "Date and time", input.createdAtLabel);
  pushDetail(fields, "Target", input.targetLabel);

  const product = formatProductDisplayName(sanitized, context);
  const vendor =
    namedWithCode(
      context.vendorName?.trim() || asNonEmptyString(sanitized.business_name),
      context.vendorCode?.trim() || null,
    ) ?? null;
  const supplier = context.supplierName?.trim() || null;
  const driver = context.driverName?.trim() || null;

  pushDetail(fields, "Product", product);
  pushDetail(fields, "Vendor", vendor);
  pushDetail(fields, "Supplier", supplier);
  pushDetail(fields, "Driver", driver);
  pushDetail(fields, "Supply reference", context.supplyRef);
  pushDetail(fields, "Payment reference", context.paymentRef);
  pushDetail(fields, "Purchase reference", context.purchaseRef);
  pushDetail(
    fields,
    "Delivery reference",
    context.deliveryRef ?? asNonEmptyString(sanitized.delivery_ref),
  );

  const changeKind = asNonEmptyString(sanitized.change_kind);
  if (changeKind) {
    pushDetail(fields, "Change", humanizeToken(changeKind));
  }

  const previousDriver = namedWithCode(
    asNonEmptyString(sanitized.previous_driver_name),
    asNonEmptyString(sanitized.previous_driver_code),
  );
  const newDriver = namedWithCode(
    asNonEmptyString(sanitized.new_driver_name),
    asNonEmptyString(sanitized.new_driver_code),
  );
  pushDetail(fields, "Previous driver", previousDriver);
  pushDetail(fields, "New driver", newDriver);

  const previousStaff = asNonEmptyString(sanitized.previous_staff_name);
  const newStaff = asNonEmptyString(sanitized.new_staff_name);
  pushDetail(fields, "Previous staff", previousStaff);
  pushDetail(fields, "New staff", newStaff);

  const fromStatus = asNonEmptyString(
    sanitized.from_status ?? sanitized.previous_status ?? sanitized.old_status,
  );
  const toStatus = asNonEmptyString(
    sanitized.to_status ?? sanitized.new_status ?? sanitized.status,
  );
  pushDetail(
    fields,
    "Previous status",
    fromStatus ? humanizeStatus(fromStatus) : null,
  );
  pushDetail(fields, "New status", toStatus ? humanizeStatus(toStatus) : null);

  const delta = asFiniteNumber(sanitized.quantity_delta);
  const after = asFiniteNumber(sanitized.quantity_after);
  const quantity = asFiniteNumber(sanitized.quantity);
  const itemCount = asFiniteNumber(sanitized.item_count);
  const totalCost = asFiniteNumber(sanitized.total_cost);
  const grandTotal = asFiniteNumber(sanitized.grand_total);
  const amount = asFiniteNumber(sanitized.amount);
  const paymentMethod = asNonEmptyString(sanitized.payment_method);
  const movementType = asNonEmptyString(sanitized.movement_type);

  if (delta !== null) {
    const signed = delta > 0 ? `+${delta}` : `${delta}`;
    pushDetail(fields, "Quantity change", `${signed} ${unitLabel(delta)}`);
  }
  if (quantity !== null) {
    pushDetail(fields, "Quantity", `${quantity} ${unitLabel(quantity)}`);
  }
  if (after !== null) {
    pushDetail(fields, "Quantity on hand", `${after} ${unitLabel(after)}`);
  }
  if (itemCount !== null) {
    pushDetail(
      fields,
      "Products",
      `${itemCount} ${itemCount === 1 ? "product" : "products"}`,
    );
  }
  if (grandTotal !== null) {
    pushDetail(fields, "Supply total", formatGhs(grandTotal));
  }
  if (amount !== null) {
    pushDetail(fields, "Payment amount", formatGhs(amount));
  }
  if (totalCost !== null) {
    pushDetail(fields, "Total amount", formatGhs(totalCost));
  }
  if (paymentMethod) {
    pushDetail(fields, "Payment method", formatPaymentMethod(paymentMethod));
  }
  if (movementType) {
    pushDetail(fields, "Reason", humanizeMovementType(movementType));
  }

  if (typeof sanitized.is_active === "boolean") {
    pushDetail(fields, "Status", sanitized.is_active ? "Active" : "Inactive");
  }

  const brand = asNonEmptyString(sanitized.brand);
  const category = asNonEmptyString(sanitized.category);
  pushDetail(fields, "Brand", brand);
  pushDetail(fields, "Category", category);

  // Description last as a narrative block when it adds more than the structured fields.
  if (input.description.trim()) {
    pushDetail(fields, "Description", input.description);
  }

  return fields;
}

export function formatAuditDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function containsForbiddenTechnicalText(value: string): boolean {
  if (looksLikeUuid(value)) return true;
  if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(value)) {
    return true;
  }
  if (/[{[]/.test(value) && /[}\]]/.test(value) && /:/.test(value)) {
    return true;
  }
  return false;
}
