import { z } from "zod";

const nonBlank = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

export const productWriteSchema = z.object({
  name: nonBlank("Product name"),
  brand: nonBlank("Brand"),
  category_id: z.uuid("Select a product category."),
  packaging_size: nonBlank("Packaging size", 160),
  unit_of_measure: nonBlank("Unit of measure"),
  is_active: z.boolean().optional().default(true),
});

export const productUpdateSchema = productWriteSchema.extend({
  id: z.uuid("Invalid product id."),
});

export const setProductActiveSchema = z.object({
  id: z.uuid("Invalid product id."),
  isActive: z.boolean(),
});

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  brand: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type ProductWriteInput = z.infer<typeof productWriteSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
