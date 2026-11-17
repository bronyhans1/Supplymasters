import type { DeliveryStatus } from "@/types/database";
import type { OperationalDeliveryStatus } from "./transitions";
import {
  canAssignOrClearDeliveryDriver,
  isOperationalDeliveryStatus,
} from "./transitions";

export function deliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "DISPATCHED":
      return "Dispatched";
    case "DELIVERED":
      return "Delivered";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "ASSIGNED":
      return "Assigned (legacy)";
    default:
      return status;
  }
}

export function deliveryStatusTone(
  status: DeliveryStatus,
): "neutral" | "info" | "good" | "accent" {
  switch (status) {
    case "PENDING":
      return "neutral";
    case "DISPATCHED":
      return "info";
    case "DELIVERED":
      return "good";
    case "FAILED":
    case "CANCELLED":
      return "accent";
    case "ASSIGNED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function deliveryStatusBadgeClass(status: DeliveryStatus): string {
  switch (deliveryStatusTone(status)) {
    case "good":
      return "bg-good/10 text-good";
    case "accent":
      return "bg-accent/10 text-accent";
    case "info":
      return "bg-ink/10 text-ink";
    case "neutral":
    default:
      return "bg-line/60 text-muted";
  }
}

export function formatDeliveryDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00Z`),
    );
  } catch {
    return value;
  }
}

export function formatDeliveryDateTime(value: string | null | undefined): string {
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

export function filterStatusOptions(): {
  value: "" | "OPEN" | OperationalDeliveryStatus;
  label: string;
}[] {
  return [
    { value: "", label: "All statuses" },
    { value: "OPEN", label: "Open (pending + dispatched)" },
    { value: "PENDING", label: "Pending" },
    { value: "DISPATCHED", label: "Dispatched" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "FAILED", label: "Failed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];
}

export function parseOperationalStatusFilter(
  value: string,
): "" | "OPEN" | OperationalDeliveryStatus {
  if (!value) return "";
  if (value === "OPEN") return "OPEN";
  return isOperationalDeliveryStatus(value) ? value : "";
}

export type AssignmentStateFilter = "" | "NEEDS_DRIVER" | "HAS_DRIVER";

export function filterAssignmentStateOptions(): {
  value: AssignmentStateFilter;
  label: string;
}[] {
  return [
    { value: "", label: "All assignment states" },
    { value: "NEEDS_DRIVER", label: "Needs driver" },
    { value: "HAS_DRIVER", label: "Driver assigned" },
  ];
}

/** Presentation helper — staff is always present; driver is the assignment gap. */
export function deliveryAssignmentStateLabel(input: {
  status: DeliveryStatus;
  driverId: string | null;
}): string {
  if (input.driverId) return "Driver assigned";
  if (canAssignOrClearDeliveryDriver(input.status)) return "Needs driver";
  return "No driver (locked)";
}

export type DeliveryAssignmentHistoryAction =
  | "DELIVERY_DRIVER_SET"
  | "DELIVERY_STAFF_SET";

/** Short title for ADMIN Assignment History rows. */
export function assignmentHistoryEventLabel(
  action: string,
  changeKind: string | null | undefined,
): string {
  const kind = changeKind?.trim() ?? "";
  if (action === "DELIVERY_DRIVER_SET") {
    if (kind === "DRIVER_CLEARED") return "Driver cleared";
    if (kind === "DRIVER_CHANGED") return "Driver reassigned";
    if (kind === "DRIVER_ASSIGNED") return "Driver assigned";
    return "Driver assignment updated";
  }
  if (action === "DELIVERY_STAFF_SET") {
    if (kind === "STAFF_CHANGED") return "Responsible staff reassigned";
    if (kind === "STAFF_ASSIGNED") return "Responsible staff assigned";
    return "Responsible staff updated";
  }
  return "Assignment updated";
}
