"use server";

import { z } from "zod";
import { FILTER_SEARCH_LIMIT } from "@/lib/query-limits";
import { AppError, rethrowNextControlFlow } from "@/lib/utils/errors";
import {
  searchActiveSupplierOptions,
  searchActiveVendorOptions,
  type SupplierOption,
  type VendorOption,
} from "./options";

const searchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  limit: z
    .number()
    .int()
    .min(1)
    .max(FILTER_SEARCH_LIMIT)
    .optional()
    .default(FILTER_SEARCH_LIMIT),
});

export type SearchVendorsResult =
  | { ok: true; vendors: VendorOption[] }
  | { ok: false; error: string };

export type SearchSuppliersResult =
  | { ok: true; suppliers: SupplierOption[] }
  | { ok: false; error: string };

export async function searchActiveVendorsAction(
  input: unknown,
): Promise<SearchVendorsResult> {
  try {
    const parsed = searchSchema.parse(input ?? {});
    const vendors = await searchActiveVendorOptions(parsed);
    return { ok: true, vendors };
  } catch (error) {
    rethrowNextControlFlow(error);
    if (error instanceof AppError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Invalid search." };
    }
    return { ok: false, error: "Unable to search vendors." };
  }
}

export async function searchActiveSuppliersAction(
  input: unknown,
): Promise<SearchSuppliersResult> {
  try {
    const parsed = searchSchema.parse(input ?? {});
    const suppliers = await searchActiveSupplierOptions(parsed);
    return { ok: true, suppliers };
  } catch (error) {
    rethrowNextControlFlow(error);
    if (error instanceof AppError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Invalid search." };
    }
    return { ok: false, error: "Unable to search suppliers." };
  }
}
