import { z } from "zod";
import { lineTotal, parseMoneyInput, roundMoney, sumLineTotals } from "./money";

const uuid = z.uuid("Select a valid record.");

const purchaseItemSchema = z
  .object({
    productId: uuid,
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .positive("Quantity must be greater than zero."),
    unitCost: z.union([z.string(), z.number()]).transform((value, ctx) => {
      const parsed = parseMoneyInput(value);
      if (parsed === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid unit cost (for example 12.50).",
        });
        return z.NEVER;
      }
      if (parsed < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Unit cost cannot be negative.",
        });
        return z.NEVER;
      }
      return roundMoney(parsed);
    }),
  })
  .transform((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitCost: item.unitCost,
    lineTotal: lineTotal(item.quantity, item.unitCost),
  }));

export const receivePurchaseSchema = z
  .object({
    clientRequestId: z.uuid("A purchase request identifier is required."),
    supplierId: uuid,
    purchaseDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid purchase date."),
    supplierInvoiceRef: z
      .string()
      .trim()
      .max(120, "Supplier invoice reference is too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes are too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    items: z.array(purchaseItemSchema).min(1, "Add at least one product."),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each product can appear only once on a purchase.",
          path: ["items", index, "productId"],
        });
      }
      seen.add(item.productId);
    }
  })
  .transform((value) => ({
    ...value,
    computedTotal: sumLineTotals(
      value.items.map((item) => ({
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    ),
  }));

export const listPurchasesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  supplierId: z.string().trim().optional().default(""),
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

export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
