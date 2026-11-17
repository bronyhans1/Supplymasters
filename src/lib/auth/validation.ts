import { z } from "zod";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

/** Sign-in: require supplied credentials only — not new-password strength. */
export const signInCredentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const passwordChangeFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your temporary password."),
    newPassword: z
      .string()
      .min(
        NEW_PASSWORD_MIN_LENGTH,
        `New password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters.`,
      )
      .regex(/[A-Za-z]/, "New password must include a letter.")
      .regex(/[0-9]/, "New password must include a number."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a new password that differs from the temporary password.",
    path: ["newPassword"],
  });
