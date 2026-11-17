import { AppError } from "@/lib/utils/errors";

export function mapDeliveryRpcError(
  error: { message?: string; code?: string } | null | undefined,
  fallbackMessage = "Unable to update this delivery.",
): AppError {
  const message = error?.message?.trim() || fallbackMessage;
  const lower = message.toLowerCase();

  if (lower.includes("only administrators may set delivery")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only administrators may change delivery assignments.",
    );
  }

  if (lower.includes("only staff or administrators")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only staff or administrators may manage deliveries.",
    );
  }

  if (lower.includes("delivery not found")) {
    return new AppError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
  }

  if (lower.includes("driver not found")) {
    return new AppError(400, "DRIVER_NOT_FOUND", "Selected driver was not found.");
  }

  if (lower.includes("inactive driver")) {
    return new AppError(
      400,
      "INACTIVE_DRIVER",
      "Cannot assign an inactive driver.",
    );
  }

  if (
    lower.includes("driver can only be set") ||
    lower.includes("pending or dispatched")
  ) {
    return new AppError(
      400,
      "DRIVER_ASSIGNMENT_LOCKED",
      "Driver can only be set or cleared while the delivery is PENDING or DISPATCHED.",
    );
  }

  if (lower.includes("terminal delivery") || lower.includes("responsible staff on a terminal")) {
    return new AppError(
      400,
      "STAFF_REASSIGN_LOCKED",
      "Cannot change responsible staff on a terminal delivery.",
    );
  }

  if (lower.includes("responsible staff must be")) {
    return new AppError(
      400,
      "INVALID_RESPONSIBLE_STAFF",
      "Responsible staff must be an active STAFF or ADMIN account.",
    );
  }

  if (lower.includes("responsible staff is required")) {
    return new AppError(
      400,
      "STAFF_REQUIRED",
      "Responsible staff is required.",
    );
  }

  if (lower.includes("assigned is not used")) {
    return new AppError(
      400,
      "INVALID_STATUS",
      "ASSIGNED is not used in the delivery workflow.",
    );
  }

  if (lower.includes("invalid delivery transition")) {
    return new AppError(
      400,
      "INVALID_TRANSITION",
      message,
    );
  }

  return new AppError(400, "DELIVERY_UPDATE_FAILED", message || fallbackMessage);
}
