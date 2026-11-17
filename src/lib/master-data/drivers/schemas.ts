import { z } from "zod";

const nonBlank = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

export const driverWriteSchema = z.object({
  full_name: nonBlank("Full name", 160),
  phone: nonBlank("Phone number", 40),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  is_active: z.boolean().optional().default(true),
});

export const driverUpdateSchema = driverWriteSchema.extend({
  id: z.uuid("Invalid driver id."),
});

export const setDriverActiveSchema = z.object({
  id: z.uuid("Invalid driver id."),
  isActive: z.boolean(),
});

export const listDriversQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type DriverWriteInput = z.infer<typeof driverWriteSchema>;
export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;
