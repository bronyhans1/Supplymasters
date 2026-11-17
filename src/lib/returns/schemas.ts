import { z } from "zod";

const uuid = z.uuid("Select a valid record.");

export const listReturnsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
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
  staffId: z.string().trim().optional().default(""),
  deliveryId: z.string().trim().optional().default(""),
  productId: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

const returnItemSchema = z.object({
  productId: uuid,
  quantity: z.coerce
    .number()
    .int("Return quantity must be a whole number.")
    .positive("Return quantity must be greater than zero."),
});

export const recordDeliveryStockReturnSchema = z
  .object({
    clientRequestId: z.uuid("A return request identifier is required."),
    deliveryId: uuid,
    notes: z
      .string()
      .trim()
      .max(2000, "Notes are too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    items: z
      .array(returnItemSchema)
      .min(1, "A stock return must include at least one product."),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each product can appear only once on a return.",
          path: ["items", index, "productId"],
        });
      }
      seen.add(item.productId);
    }
  });

export type ListReturnsQuery = z.infer<typeof listReturnsQuerySchema>;
export type RecordDeliveryStockReturnInput = z.infer<
  typeof recordDeliveryStockReturnSchema
>;
