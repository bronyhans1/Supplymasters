import { AppError } from "@/lib/utils/errors";

export function mapReturnRpcError(
  error: { message?: string; code?: string } | null | undefined,
): AppError {
  const message = error?.message?.trim() || "Unable to record this stock return.";
  const lower = message.toLowerCase();

  if (lower.includes("only staff or administrators")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only staff or administrators may record delivery stock returns.",
    );
  }

  if (lower.includes("different stock return")) {
    return new AppError(
      409,
      "REQUEST_CONFLICT",
      "This return request was already used with different details. Start a new return.",
    );
  }

  if (lower.includes("request identifier")) {
    return new AppError(
      400,
      "MISSING_REQUEST_ID",
      "This return submission could not be verified. Refresh and try again.",
    );
  }

  if (lower.includes("at least one product")) {
    return new AppError(
      400,
      "EMPTY_RETURN",
      "A stock return must include at least one product line.",
    );
  }

  if (lower.includes("delivery not found")) {
    return new AppError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
  }

  if (
    lower.includes("only allowed for failed or cancelled") ||
    lower.includes("failed or cancelled")
  ) {
    return new AppError(
      400,
      "INVALID_DELIVERY_STATUS",
      "Stock returns are only allowed for FAILED or CANCELLED deliveries.",
    );
  }

  if (lower.includes("duplicate product")) {
    return new AppError(
      400,
      "DUPLICATE_PRODUCT",
      "Each product can appear only once on a return.",
    );
  }

  if (lower.includes("positive integer") || lower.includes("quantity must be")) {
    return new AppError(
      400,
      "INVALID_QUANTITY",
      "Return quantity must be a positive whole number.",
    );
  }

  if (lower.includes("was not part of the original supply")) {
    return new AppError(
      400,
      "INVALID_PRODUCT",
      "Returned products must belong to the original supply for this delivery.",
    );
  }

  if (lower.includes("exceeds remaining quantity")) {
    return new AppError(
      400,
      "QUANTITY_EXCEEDED",
      "One or more return quantities exceed what remains available for that product.",
    );
  }

  return new AppError(
    400,
    "RETURN_RECORD_FAILED",
    "The stock return could not be recorded. Inventory was not changed.",
  );
}
