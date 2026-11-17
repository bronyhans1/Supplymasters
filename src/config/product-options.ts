/**
 * Centralized product form suggestions for packaging and unit of measure.
 * Product categories are managed in `product_categories` (not hardcoded here).
 * Brand remains free-text on products.
 */

/**
 * Packaging size = how the product is packed for sale/distribution.
 * Not the same as unit_of_measure (how stock is counted).
 * Keep suggestions generic — do not invent SKU-specific weights.
 */
export const PRODUCT_PACKAGING_SIZE_OPTIONS = [
  "Single pack",
  "Multi-pack",
  "Carton",
  "Display box",
  "Other",
] as const;

export type ProductPackagingSizeOption =
  (typeof PRODUCT_PACKAGING_SIZE_OPTIONS)[number];

export const PRODUCT_UNIT_OF_MEASURE_OPTIONS = [
  "Carton",
  "Pack",
  "Piece",
  "Box",
  "Other",
] as const;

export type ProductUnitOfMeasureOption =
  (typeof PRODUCT_UNIT_OF_MEASURE_OPTIONS)[number];

export const PRODUCT_FIELD_HELP = {
  packaging_size:
    "Describe the packaging configuration (for example, “40 × 70 g per carton”). This is not the inventory counting unit.",
  unit_of_measure:
    "How stock is counted in inventory and supply lines (for example, Carton or Pack).",
  category:
    "Choose a managed product category. Inactive categories stay visible on existing products but cannot be newly assigned.",
} as const;

export function isKnownOption(
  options: readonly string[],
  value: string,
): boolean {
  return options.includes(value);
}

/** Resolve dropdown selection + optional custom text into the stored value. */
export function resolveSelectableValue(
  selection: string,
  customValue: string,
  options: readonly string[],
): string {
  if (selection === "Other" || !isKnownOption(options, selection)) {
    return customValue.trim();
  }
  return selection.trim();
}
