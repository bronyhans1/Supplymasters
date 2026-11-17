import { z } from "zod";

const nonBlank = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(160, `${label} is too long.`);

export const supplierWriteSchema = z.object({
  name: nonBlank("Supplier name"),
  contact_person: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length > 0 ? value : null)),
  phone: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value.length > 0 ? value : null)),
  location: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value.length > 0 ? value : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  is_active: z.boolean().optional().default(true),
});

export const supplierUpdateSchema = supplierWriteSchema.extend({
  id: z.uuid("Invalid supplier id."),
});

export const setSupplierActiveSchema = z.object({
  id: z.uuid("Invalid supplier id."),
  isActive: z.boolean(),
});

export const listSuppliersQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type SupplierWriteInput = z.infer<typeof supplierWriteSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
