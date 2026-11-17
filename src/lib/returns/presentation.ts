import type { DeliveryStatus } from "@/types/database";
import { canRecordReturnForDeliveryStatus } from "./authorization";

const RETURN_REF_PATTERN = /^(NM|SM)-RET-[0-9]{6}$/;

/**
 * Prefer the database business reference. Never invent RET-UUID codes for valid refs.
 */
export function formatReturnDisplayId(
  returnRef: string | null | undefined,
  fallbackId?: string | null,
): string {
  const ref = returnRef?.trim() ?? "";
  if (RETURN_REF_PATTERN.test(ref)) return ref;
  if (ref) return ref;
  return fallbackId?.trim() || "—";
}

export function isReturnBusinessRef(value: string | null | undefined): boolean {
  return RETURN_REF_PATTERN.test(value?.trim() ?? "");
}

export function formatReturnDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatReturnDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export function returnEligibilityMessage(status: DeliveryStatus): string {
  if (canRecordReturnForDeliveryStatus(status)) {
    return "This delivery can accept an explicit stock return.";
  }
  return "Stock returns are only allowed for FAILED or CANCELLED deliveries.";
}
