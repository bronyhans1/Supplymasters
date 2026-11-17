import { z } from "zod";
import { TEMP_PASSWORD_MIN_LENGTH } from "@/lib/admin/users/password";
import { APP_ROLES, PROVISIONABLE_ROLES } from "@/lib/auth/roles";

/** Any role present on a profile (including legacy DRIVER). Used for filters. */
export const appRoleSchema = z.enum(APP_ROLES);

/** Roles that may be assigned when creating or updating users. */
export const provisionableRoleSchema = z.enum(PROVISIONABLE_ROLES);

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name is too long."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long.")
    .transform((value) => (value.length > 0 ? value : null)),
  role: provisionableRoleSchema,
  temporaryPassword: z
    .string()
    .min(
      TEMP_PASSWORD_MIN_LENGTH,
      `Temporary password must be at least ${TEMP_PASSWORD_MIN_LENGTH} characters.`,
    )
    .max(128, "Temporary password is too long.")
    .regex(/[A-Za-z]/, "Temporary password must include a letter.")
    .regex(/[0-9]/, "Temporary password must include a number."),
});

export const setUserRoleSchema = z.object({
  userId: z.uuid("Invalid user id."),
  role: provisionableRoleSchema,
});

export const setUserActiveSchema = z.object({
  userId: z.uuid("Invalid user id."),
  isActive: z.boolean(),
});

export const requirePasswordChangeSchema = z.object({
  userId: z.uuid("Invalid user id."),
});

/** Finish activation after Auth create when role assignment previously failed. */
export const completeUserProvisioningSchema = z.object({
  userId: z.uuid("Invalid user id."),
  role: provisionableRoleSchema,
});

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  role: z
    .union([z.literal("ALL"), appRoleSchema])
    .optional()
    .default("ALL"),
  status: z
    .enum(["ALL", "ACTIVE", "INACTIVE"])
    .optional()
    .default("ALL"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
