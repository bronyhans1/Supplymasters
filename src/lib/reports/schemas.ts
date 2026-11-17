import { z } from "zod";
import type { DeliveryStatus, PaymentMethod } from "@/types/database";
import { PAYMENT_METHODS } from "@/lib/payments/schemas";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const REPORT_PERIOD_PRESETS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "custom",
] as const;

export type ReportPeriodPreset = (typeof REPORT_PERIOD_PRESETS)[number];

export const REPORT_SECTIONS = [
  "overview",
  "supplies",
  "payments",
  "inventory",
  "purchasing",
  "deliveries",
  "returns",
  "vendors",
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

const DELIVERY_STATUSES = [
  "PENDING",
  "DISPATCHED",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly DeliveryStatus[];

export const reportsQuerySchema = z
  .object({
    period: z.enum(REPORT_PERIOD_PRESETS).default("this_month"),
    fromDate: z.union([isoDate, z.literal("")]).default(""),
    toDate: z.union([isoDate, z.literal("")]).default(""),
    section: z.enum(REPORT_SECTIONS).default("overview"),
    vendorId: z.union([z.string().uuid(), z.literal("")]).default(""),
    productId: z.union([z.string().uuid(), z.literal("")]).default(""),
    supplierId: z.union([z.string().uuid(), z.literal("")]).default(""),
    paymentMethod: z
      .union([z.enum(PAYMENT_METHODS), z.literal("")])
      .default(""),
    deliveryStatus: z
      .union([z.enum(DELIVERY_STATUSES), z.literal("")])
      .default(""),
    staffId: z.union([z.string().uuid(), z.literal("")]).default(""),
    page: z.coerce.number().int().min(1).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.period === "custom") {
      if (!value.fromDate) {
        ctx.addIssue({
          code: "custom",
          message: "Custom range requires a start date.",
          path: ["fromDate"],
        });
      }
      if (!value.toDate) {
        ctx.addIssue({
          code: "custom",
          message: "Custom range requires an end date.",
          path: ["toDate"],
        });
      }
    }
  });

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

export const REPORTS_PAGE_SIZE = 20;

export function parseReportsQuery(
  raw: Partial<Record<string, string | string[] | undefined>>,
): ReportsQuery {
  return reportsQuerySchema.parse({
    period: typeof raw.period === "string" ? raw.period : "this_month",
    fromDate: typeof raw.fromDate === "string" ? raw.fromDate : "",
    toDate: typeof raw.toDate === "string" ? raw.toDate : "",
    section: typeof raw.section === "string" ? raw.section : "overview",
    vendorId: typeof raw.vendorId === "string" ? raw.vendorId : "",
    productId: typeof raw.productId === "string" ? raw.productId : "",
    supplierId: typeof raw.supplierId === "string" ? raw.supplierId : "",
    paymentMethod:
      typeof raw.paymentMethod === "string" ? raw.paymentMethod : "",
    deliveryStatus:
      typeof raw.deliveryStatus === "string" ? raw.deliveryStatus : "",
    staffId: typeof raw.staffId === "string" ? raw.staffId : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  });
}

export type { PaymentMethod };
