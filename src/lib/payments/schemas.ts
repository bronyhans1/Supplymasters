import { z } from "zod";
import type { PaymentMethod } from "@/types/database";

export const PAYMENT_METHODS = [
  "CASH",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const satisfies readonly PaymentMethod[];

export const listPaymentsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  paymentMethod: z
    .union([z.literal(""), z.enum(PAYMENT_METHODS)])
    .optional()
    .default(""),
  fromDate: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Enter a valid from date.",
    }),
  toDate: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Enter a valid to date.",
    }),
  vendorId: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
