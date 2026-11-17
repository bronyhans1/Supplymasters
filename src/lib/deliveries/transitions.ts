import type { DeliveryStatus } from "@/types/database";

/** Statuses used in the operational UI. ASSIGNED is retained in the DB enum only. */
export const OPERATIONAL_DELIVERY_STATUSES = [
  "PENDING",
  "DISPATCHED",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly DeliveryStatus[];

export type OperationalDeliveryStatus = (typeof OPERATIONAL_DELIVERY_STATUSES)[number];

export const TERMINAL_DELIVERY_STATUSES = [
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly OperationalDeliveryStatus[];

export function isOperationalDeliveryStatus(
  value: string,
): value is OperationalDeliveryStatus {
  return (OPERATIONAL_DELIVERY_STATUSES as readonly string[]).includes(value);
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return (TERMINAL_DELIVERY_STATUSES as readonly string[]).includes(status);
}

/**
 * Frontend presentation helper — mirrors DB is_valid_delivery_transition.
 * The update_delivery_status RPC remains authoritative.
 */
export function allowedNextStatuses(from: DeliveryStatus): OperationalDeliveryStatus[] {
  switch (from) {
    case "PENDING":
      return ["DISPATCHED", "CANCELLED"];
    case "DISPATCHED":
      return ["DELIVERED", "FAILED"];
    case "DELIVERED":
    case "FAILED":
    case "CANCELLED":
    case "ASSIGNED":
      return [];
    default: {
      const _exhaustive: never = from;
      return _exhaustive;
    }
  }
}

export function canTransitionDeliveryStatus(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  if (from === to) return true;
  return allowedNextStatuses(from).includes(to as OperationalDeliveryStatus);
}

export function canAssignOrClearDeliveryDriver(status: DeliveryStatus): boolean {
  return status === "PENDING" || status === "DISPATCHED";
}

export function canReassignResponsibleStaff(status: DeliveryStatus): boolean {
  return !isTerminalDeliveryStatus(status);
}

export function statusActionLabel(to: OperationalDeliveryStatus): string {
  switch (to) {
    case "DISPATCHED":
      return "Dispatch";
    case "DELIVERED":
      return "Mark delivered";
    case "FAILED":
      return "Mark failed";
    case "CANCELLED":
      return "Cancel delivery";
    case "PENDING":
      return "Pending";
    default: {
      const _exhaustive: never = to;
      return _exhaustive;
    }
  }
}
