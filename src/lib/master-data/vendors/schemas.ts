import { z } from "zod";

const nonBlank = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(160, `${label} is too long.`);

export const vendorWriteSchema = z.object({
  business_name: nonBlank("Business name"),
  contact_person: nonBlank("Contact person"),
  phone: nonBlank("Phone number"),
  alt_phone: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value.length > 0 ? value : null)),
  location: nonBlank("Location"),
  digital_address: z
    .string()
    .trim()
    .max(80)
    .transform((value) => (value.length > 0 ? value : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  is_active: z.boolean().optional().default(true),
});

export const vendorUpdateSchema = vendorWriteSchema.extend({
  id: z.uuid("Invalid vendor id."),
});

export const setVendorActiveSchema = z.object({
  id: z.uuid("Invalid vendor id."),
  isActive: z.boolean(),
});

export const listVendorsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type VendorWriteInput = z.infer<typeof vendorWriteSchema>;
export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;
