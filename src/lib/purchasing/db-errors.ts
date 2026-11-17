import { AppError } from "@/lib/utils/errors";

/**
 * Map purchase receive failures to safe operator-facing messages.
 * Never echo raw SQL / RPC names to the UI.
 */
export function mapPurchaseReceiveError(
  error: { message?: string; code?: string } | null | undefined,
): AppError {
  const message = error?.message?.trim() || "Unable to receive this purchase.";
  const lower = message.toLowerCase();

  // Phase D admin-only gate (current RPC text).
  if (lower.includes("only administrators may receive")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only administrators may receive stock purchases.",
    );
  }

  // Legacy staff/admin wording (kept for older deployed RPC text).
  if (lower.includes("only staff or administrators")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only administrators may receive stock purchases.",
    );
  }

  if (
    lower.includes("different stock purchase") ||
    lower.includes("already used for a different")
  ) {
    return new AppError(
      409,
      "REQUEST_CONFLICT",
      "This request was already used for a different stock purchase. Start a new receive if you meant a separate purchase.",
    );
  }

  if (lower.includes("request identifier")) {
    return new AppError(
      400,
      "MISSING_REQUEST_ID",
      "This purchase submission could not be verified. Refresh and try again.",
    );
  }

  if (lower.includes("at least one product")) {
    return new AppError(
      400,
      "EMPTY_PURCHASE",
      "A purchase must include at least one product.",
    );
  }

  if (lower.includes("inactive supplier") || lower.includes("stock supplier not found")) {
    return new AppError(
      400,
      "INVALID_SUPPLIER",
      "Choose an active stock supplier for this purchase.",
    );
  }

  if (lower.includes("active product") || lower.includes("purchase lines require")) {
    return new AppError(
      400,
      "INVALID_PRODUCT",
      "Every line must use an active product.",
    );
  }

  if (
    lower.includes("unique") ||
    lower.includes("duplicate") ||
    lower.includes("stock_purchase_items_unique_product")
  ) {
    return new AppError(
      400,
      "DUPLICATE_PRODUCT",
      "Each product can appear only once on a purchase.",
    );
  }

  if (lower.includes("quantity") || lower.includes("unit_purchase_cost")) {
    return new AppError(
      400,
      "INVALID_LINE",
      "Check that quantities and unit costs are valid.",
    );
  }

  return new AppError(
    400,
    "PURCHASE_RECEIVE_FAILED",
    "The purchase could not be received. No inventory changes were applied.",
  );
}
