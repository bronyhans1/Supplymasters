import type { Json } from "@/types/database";

/** Keys that must never appear in UI output (case-insensitive match on leaf keys). */
const DENY_KEYS = new Set([
  "phone",
  "alt_phone",
  "notes",
  "password",
  "password_hash",
  "credentials",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "secrets",
  "api_key",
  "authorization",
  "contact_person",
  "contact_details",
  "email",
]);

/**
 * Explicit allowlist for top-level and nested metadata keys.
 * Anything not listed is dropped (do not infer missing values).
 */
const ALLOW_KEYS = new Set([
  "code",
  "name",
  "is_active",
  "changed_fields",
  "after",
  "before",
  "role",
  "old_role",
  "new_role",
  "previous_role",
  "from_role",
  "to_role",
  "status",
  "from_status",
  "to_status",
  "previous_status",
  "new_status",
  "old_status",
  "movement_type",
  "quantity_delta",
  "quantity",
  "quantity_after",
  "item_count",
  "total_cost",
  "grand_total",
  "amount",
  "payment_method",
  "product_id",
  "vendor_id",
  "supplier_id",
  "driver_id",
  "delivery_id",
  "purchase_id",
  "supply_id",
  "payment_id",
  "return_id",
  "inventory_id",
  "client_request_id",
  "responsible_staff_id",
  "must_change_password",
  "brand",
  "category",
  "packaging_size",
  "unit_of_measure",
  "business_name",
  // Phase C assignment history snapshots (names/codes only — never emails).
  "change_kind",
  "delivery_ref",
  "actor_name",
  "previous_driver_id",
  "previous_driver_code",
  "previous_driver_name",
  "new_driver_id",
  "new_driver_code",
  "new_driver_name",
  "previous_staff_id",
  "previous_staff_name",
  "previous_staff_role",
  "new_staff_id",
  "new_staff_name",
  "new_staff_role",
]);

/** UUID / request-id style keys shown under Technical IDs in the UI. */
export const AUDIT_TECHNICAL_METADATA_KEYS = new Set([
  "product_id",
  "vendor_id",
  "supplier_id",
  "driver_id",
  "delivery_id",
  "purchase_id",
  "supply_id",
  "payment_id",
  "return_id",
  "inventory_id",
  "client_request_id",
  "responsible_staff_id",
  "previous_driver_id",
  "new_driver_id",
  "previous_staff_id",
  "new_staff_id",
]);

function isDeniedKey(key: string): boolean {
  return DENY_KEYS.has(key.toLowerCase());
}

function isAllowedKey(key: string): boolean {
  return ALLOW_KEYS.has(key);
}

function sanitizeValue(value: Json, depth: number): Json | undefined {
  if (depth > 6) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((item) => sanitizeValue(item as Json, depth + 1))
      .filter((item) => item !== undefined) as Json[];
    return next;
  }
  if (typeof value === "object") {
    return sanitizeMetadataObject(value as Record<string, Json>, depth + 1);
  }
  return undefined;
}

function sanitizeMetadataObject(
  input: Record<string, Json>,
  depth: number,
): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (isDeniedKey(key)) continue;
    if (!isAllowedKey(key)) continue;
    const cleaned = sanitizeValue(raw, depth);
    if (cleaned !== undefined) {
      out[key] = cleaned;
    }
  }
  return out;
}

/**
 * Returns only allowlisted, non-sensitive metadata for display.
 * Never invents keys or fills omitted sensitive values.
 */
export function sanitizeAuditMetadata(metadata: Json | null | undefined): Record<string, Json> {
  if (metadata === null || metadata === undefined) return {};
  if (typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return sanitizeMetadataObject(metadata as Record<string, Json>, 0);
}

export function partitionAuditMetadata(sanitized: Record<string, Json>): {
  human: Record<string, Json>;
  technical: Record<string, Json>;
} {
  const human: Record<string, Json> = {};
  const technical: Record<string, Json> = {};
  for (const [key, value] of Object.entries(sanitized)) {
    if (AUDIT_TECHNICAL_METADATA_KEYS.has(key)) {
      technical[key] = value;
    } else {
      human[key] = value;
    }
  }
  return { human, technical };
}
