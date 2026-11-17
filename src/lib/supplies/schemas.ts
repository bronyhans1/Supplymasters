import { z } from "zod";
import type { PaymentMethod } from "@/types/database";
import { lineTotal, parseMoneyInput, roundMoney, sumLineTotals } from "./money";

const uuid = z.uuid("Select a valid record.");

export const PAYMENT_METHODS = [
  "CASH",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const satisfies readonly PaymentMethod[];

const paymentMethodSchema = z.enum(PAYMENT_METHODS);

const supplyItemSchema = z
  .object({
    productId: uuid,
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .positive("Quantity must be greater than zero."),
    unitPrice: z.union([z.string(), z.number()]).transform((value, ctx) => {
      const parsed = parseMoneyInput(value);
      if (parsed === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid unit price (for example 12.50).",
        });
        return z.NEVER;
      }
      if (parsed < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Unit price cannot be negative.",
        });
        return z.NEVER;
      }
      return roundMoney(parsed);
    }),
  })
  .transform((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: lineTotal(item.quantity, item.unitPrice),
  }));

export const createSupplySchema = z
  .object({
    clientRequestId: z.uuid("A supply request identifier is required."),
    vendorId: uuid,
    supplyDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid supply date."),
    paymentMethod: paymentMethodSchema,
    transactionReference: z
      .string()
      .trim()
      .max(120, "Payment reference is too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes are too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    items: z.array(supplyItemSchema).min(1, "Add at least one product."),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each product can appear only once on a supply.",
          path: ["items", index, "productId"],
        });
      }
      seen.add(item.productId);
    }
  })
  .transform((value) => {
    const computedTotal = sumLineTotals(
      value.items.map((item) => ({
        quantity: item.quantity,
        unitCost: item.unitPrice,
      })),
    );
    return {
      ...value,
      computedTotal,
      totalQuantity: value.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  })
  .superRefine((value, ctx) => {
    if (value.computedTotal <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Supply total must be greater than zero for full payment.",
        path: ["items"],
      });
    }
  });

export const listSuppliesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  vendorId: z.string().trim().optional().default(""),
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
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
export type ListSuppliesQuery = z.infer<typeof listSuppliesQuerySchema>;
