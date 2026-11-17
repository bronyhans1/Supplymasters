import { z } from "zod";

const categoryName = z
  .string()
  .trim()
  .min(1, "Category name is required.")
  .max(120, "Category name is too long.");

export const categoryWriteSchema = z.object({
  name: categoryName,
  is_active: z.boolean().optional().default(true),
});

export const categoryUpdateSchema = categoryWriteSchema.extend({
  id: z.uuid("Invalid category id."),
});

export const setCategoryActiveSchema = z.object({
  id: z.uuid("Invalid category id."),
  isActive: z.boolean(),
});

export const listCategoriesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type CategoryWriteInput = z.infer<typeof categoryWriteSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
