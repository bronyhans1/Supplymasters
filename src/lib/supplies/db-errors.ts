import { AppError } from "@/lib/utils/errors";

export function mapSupplyCreateError(
  error: { message?: string; code?: string } | null | undefined,
): AppError {
  const message = error?.message?.trim() || "Unable to create this supply.";
  const lower = message.toLowerCase();

  if (lower.includes("only staff or administrators")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only staff or administrators may create supplies.",
    );
  }

  if (lower.includes("different supply transaction")) {
    return new AppError(
      409,
      "REQUEST_CONFLICT",
      "This supply request was already used with different details. Start a new supply.",
    );
  }

  if (lower.includes("request identifier")) {
    return new AppError(
      400,
      "MISSING_REQUEST_ID",
      "This supply submission could not be verified. Refresh and try again.",
    );
  }

  if (lower.includes("payment method")) {
    return new AppError(
      400,
      "PAYMENT_METHOD_REQUIRED",
      "Select a payment method.",
    );
  }

  if (lower.includes("at least one product")) {
    return new AppError(
      400,
      "EMPTY_SUPPLY",
      "A supply must include at least one product.",
    );
  }

  if (lower.includes("inactive vendor") || lower.includes("vendor not found")) {
    return new AppError(
      400,
      "INVALID_VENDOR",
      "Choose an active vendor for this supply.",
    );
  }

  if (lower.includes("active product") || lower.includes("supply lines require")) {
    return new AppError(
      400,
      "INVALID_PRODUCT",
      "Every line must use an active product.",
    );
  }

  if (lower.includes("insufficient stock")) {
    return new AppError(
      400,
      "INSUFFICIENT_STOCK",
      "One or more products do not have enough stock for this supply.",
    );
  }

  if (lower.includes("zero total")) {
    return new AppError(
      400,
      "ZERO_TOTAL",
      "Supply total must be greater than zero.",
    );
  }

  if (
    lower.includes("unique") ||
    lower.includes("duplicate") ||
    lower.includes("supply_items_unique_product")
  ) {
    return new AppError(
      400,
      "DUPLICATE_PRODUCT",
      "Each product can appear only once on a supply.",
    );
  }

  if (lower.includes("quantities must be positive") || lower.includes("unit prices")) {
    return new AppError(
      400,
      "INVALID_LINE",
      "Check that quantities and unit prices are valid.",
    );
  }

  return new AppError(
    400,
    "SUPPLY_CREATE_FAILED",
    "The supply could not be completed. No stock changes were applied.",
  );
}
