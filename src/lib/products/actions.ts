"use server";

import { z } from "zod";
import {
  PRODUCT_OPTION_SEARCH_LIMIT,
  searchActiveProductOptions,
  type ProductOption,
} from "@/lib/products/options";
import { AppError, rethrowNextControlFlow } from "@/lib/utils/errors";

const searchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  includeStock: z.boolean().optional().default(false),
  excludeIds: z.array(z.uuid()).max(200).optional().default([]),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PRODUCT_OPTION_SEARCH_LIMIT)
    .optional()
    .default(PRODUCT_OPTION_SEARCH_LIMIT),
});

export type SearchActiveProductsResult =
  | { ok: true; products: ProductOption[] }
  | { ok: false; error: string };

/**
 * Client-callable typeahead for active products.
 * STAFF/ADMIN only (enforced inside searchActiveProductOptions).
 */
export async function searchActiveProductsAction(
  input: unknown,
): Promise<SearchActiveProductsResult> {
  try {
    const parsed = searchSchema.parse(input ?? {});
    const products = await searchActiveProductOptions(parsed);
    return { ok: true, products };
  } catch (error) {
    rethrowNextControlFlow(error);
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Invalid search." };
    }
    return { ok: false, error: "Unable to search products." };
  }
}
