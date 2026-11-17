import { z } from "zod";
import {
  OPERATIONAL_DELIVERY_STATUSES,
  allowedNextStatuses,
  canAssignOrClearDeliveryDriver,
  canReassignResponsibleStaff,
  canTransitionDeliveryStatus,
} from "./transitions";
import type { DeliveryStatus } from "@/types/database";

const uuid = z.uuid("Select a valid record.");

/** List filter statuses include OPEN = PENDING + DISPATCHED (dashboard drill-down). */
export const DELIVERY_LIST_STATUS_FILTERS = [
  "",
  "OPEN",
  ...OPERATIONAL_DELIVERY_STATUSES,
] as const;

export const listDeliveriesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z
    .union([
      z.literal(""),
      z.literal("OPEN"),
      z.enum(OPERATIONAL_DELIVERY_STATUSES),
    ])
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
  staffId: z.string().trim().optional().default(""),
  driverId: z.string().trim().optional().default(""),
  /** Driver assignment state (staff is always required on deliveries). */
  assignmentState: z
    .union([
      z.literal(""),
      z.literal("NEEDS_DRIVER"),
      z.literal("HAS_DRIVER"),
    ])
    .optional()
    .default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const setDeliveryDriverSchema = z
  .object({
    deliveryId: uuid,
    driverId: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) => {
        if (value == null) return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }),
    currentStatus: z.custom<DeliveryStatus>(),
  })
  .superRefine((value, ctx) => {
    if (!canAssignOrClearDeliveryDriver(value.currentStatus)) {
      ctx.addIssue({
        code: "custom",
        message: "Driver can only be set or cleared while PENDING or DISPATCHED.",
        path: ["currentStatus"],
      });
    }
    if (value.driverId !== null) {
      const parsed = z.uuid().safeParse(value.driverId);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Select a valid driver.",
          path: ["driverId"],
        });
      }
    }
  });

export const setDeliveryResponsibleStaffSchema = z
  .object({
    deliveryId: uuid,
    staffId: uuid,
    currentStatus: z.custom<DeliveryStatus>(),
  })
  .superRefine((value, ctx) => {
    if (!canReassignResponsibleStaff(value.currentStatus)) {
      ctx.addIssue({
        code: "custom",
        message: "Cannot change responsible staff on a terminal delivery.",
        path: ["currentStatus"],
      });
    }
  });

export const updateDeliveryStatusSchema = z
  .object({
    deliveryId: uuid,
    fromStatus: z.custom<DeliveryStatus>(),
    toStatus: z.enum(OPERATIONAL_DELIVERY_STATUSES),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes are too long.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .superRefine((value, ctx) => {
    if (!canTransitionDeliveryStatus(value.fromStatus, value.toStatus)) {
      const allowed = allowedNextStatuses(value.fromStatus).join(", ") || "none";
      ctx.addIssue({
        code: "custom",
        message: `Invalid delivery transition from ${value.fromStatus} to ${value.toStatus}. Allowed: ${allowed}.`,
        path: ["toStatus"],
      });
    }
  });

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
export type SetDeliveryDriverInput = z.infer<typeof setDeliveryDriverSchema>;
export type SetDeliveryResponsibleStaffInput = z.infer<
  typeof setDeliveryResponsibleStaffSchema
>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
