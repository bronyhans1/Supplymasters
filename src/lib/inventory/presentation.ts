import type { StockMovementType } from "@/types/database";

export function stockMovementLabel(type: StockMovementType): string {
  switch (type) {
    case "PURCHASE":
      return "Purchase receipt";
    case "SUPPLY_DISPATCH":
      return "Supply dispatch";
    case "DELIVERY_RETURN":
      return "Delivery return";
    case "ADJUSTMENT":
      return "Stock adjustment";
    case "CORRECTION":
      return "Stock correction";
    default:
      return type;
  }
}

export function stockMovementReferenceLabel(
  referenceType: string | null,
  referenceId: string | null,
): string {
  if (!referenceType) return "—";
  if (referenceType === "stock_purchases") {
    return referenceId ? "Purchase receipt" : "Purchase";
  }
  if (referenceType === "supplies") {
    return referenceId ? "Supply" : "Supply";
  }
  if (referenceType === "delivery_stock_returns") {
    return "Delivery return";
  }
  if (referenceType === "inventory_adjustment") {
    return "Manual adjustment";
  }
  return referenceType.replace(/_/g, " ");
}

export function formatSignedQuantity(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
