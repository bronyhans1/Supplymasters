import { AppError } from "@/lib/utils/errors";

export function mapInventoryAdjustError(
  error: { message?: string } | null | undefined,
): AppError {
  const message = error?.message?.trim() || "Unable to adjust inventory.";
  const lower = message.toLowerCase();

  if (lower.includes("only staff or administrators")) {
    return new AppError(
      403,
      "FORBIDDEN",
      "Only staff or administrators may adjust inventory.",
    );
  }

  if (lower.includes("different stock adjustment")) {
    return new AppError(
      409,
      "REQUEST_CONFLICT",
      "This adjustment request was already used with different details. Start a new adjustment.",
    );
  }

  if (lower.includes("request identifier is required")) {
    return new AppError(
      400,
      "REQUEST_ID_REQUIRED",
      "A valid adjustment request identifier is required.",
    );
  }

  if (lower.includes("insufficient stock")) {
    return new AppError(
      400,
      "INSUFFICIENT_STOCK",
      "That adjustment would reduce stock below zero.",
    );
  }

  if (lower.includes("cannot be zero") || lower.includes("quantity cannot be zero")) {
    return new AppError(
      400,
      "INVALID_QUANTITY",
      "Enter a non-zero adjustment quantity.",
    );
  }

  if (lower.includes("require a recorded reason")) {
    return new AppError(
      400,
      "REASON_REQUIRED",
      "Enter a reason for this stock adjustment.",
    );
  }

  if (lower.includes("product not found")) {
    return new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  return new AppError(
    400,
    "INVENTORY_ADJUST_FAILED",
    "The stock adjustment could not be completed.",
  );
}
