import { z } from "zod";

const uuid = z.uuid("Select a valid product.");
const requestId = z.uuid("A valid adjustment request identifier is required.");

export const listInventoryQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  stock: z.enum(["ALL", "IN_STOCK", "ZERO"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const adjustInventorySchema = z
  .object({
    clientRequestId: requestId,
    productId: uuid,
    direction: z.enum(["increase", "decrease"]),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .positive("Quantity must be greater than zero."),
    reason: z
      .string()
      .trim()
      .min(3, "Enter a brief reason for this adjustment.")
      .max(500, "Reason is too long."),
  })
  .transform((value) => ({
    clientRequestId: value.clientRequestId,
    productId: value.productId,
    quantityDelta:
      value.direction === "increase" ? value.quantity : -value.quantity,
    reason: value.reason,
    direction: value.direction,
    quantity: value.quantity,
  }));

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
