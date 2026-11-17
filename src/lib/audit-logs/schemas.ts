import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/** Curated filter options — free-text `action`/`entityType` also accepted via exact match. */
export const AUDIT_ACTION_OPTIONS = [
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_ACTIVATED",
  "PRODUCT_DEACTIVATED",
  "PRODUCT_CATEGORY_CREATED",
  "PRODUCT_CATEGORY_UPDATED",
  "PRODUCT_CATEGORY_ACTIVATED",
  "PRODUCT_CATEGORY_DEACTIVATED",
  "VENDOR_CREATED",
  "VENDOR_UPDATED",
  "VENDOR_ACTIVATED",
  "VENDOR_DEACTIVATED",
  "STOCK_SUPPLIER_CREATED",
  "STOCK_SUPPLIER_UPDATED",
  "STOCK_SUPPLIER_ACTIVATED",
  "STOCK_SUPPLIER_DEACTIVATED",
  "DRIVER_CREATED",
  "DRIVER_UPDATED",
  "DRIVER_ACTIVATED",
  "DRIVER_DEACTIVATED",
  "STOCK_MOVEMENT_RECORDED",
  "SUPPLY_CREATED",
  "PAYMENT_RECORDED",
  "STOCK_PURCHASE_RECEIVED",
  "DELIVERY_DRIVER_SET",
  "DELIVERY_STAFF_SET",
  "DELIVERY_STATUS_UPDATED",
  "DELIVERY_STOCK_RETURNED",
  "FIRST_ADMIN_BOOTSTRAPPED",
  "USER_PROVISIONED",
  "USER_ROLE_UPDATED",
  "PROFILE_REPAIRED",
  "PROFILE_EMAIL_SYNCED",
  "PASSWORD_CHANGE_REQUIRED",
  "PASSWORD_CHANGE_COMPLETED",
] as const;

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  "products",
  "product_categories",
  "vendors",
  "stock_suppliers",
  "drivers",
  "stock_movements",
  "supplies",
  "payments",
  "stock_purchases",
  "deliveries",
  "delivery_stock_returns",
  "profiles",
] as const;

export const AUDIT_LOGS_PAGE_SIZE = 20;

export const listAuditLogsQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional().default(""),
    action: z.string().trim().max(120).optional().default(""),
    entityType: z.string().trim().max(120).optional().default(""),
    actor: z.string().trim().max(200).optional().default(""),
    entityId: z.union([z.string().uuid(), z.literal("")]).optional().default(""),
    fromDate: z.union([isoDate, z.literal("")]).optional().default(""),
    toDate: z.union([isoDate, z.literal("")]).optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
  })
  .superRefine((value, ctx) => {
    if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
      ctx.addIssue({
        code: "custom",
        message: "From date must be on or before to date.",
        path: ["fromDate"],
      });
    }
  });

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
