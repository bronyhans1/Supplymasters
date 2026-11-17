/**
 * Application password rules.
 *
 * Sign-in validates that a password was supplied — not that it meets
 * creation-strength rules. Temporary and new-password policies differ.
 *
 * Supabase Auth also enforces the project dashboard password settings.
 * TEMP_PASSWORD_MIN_LENGTH must not be lower than that project minimum.
 */

export const TEMP_PASSWORD_MIN_LENGTH = 6;
export const TEMP_PASSWORD_GENERATED_LENGTH = 12;
export const NEW_PASSWORD_MIN_LENGTH = 8;

export const passwordPolicyCopy = {
  temporary:
    `At least ${TEMP_PASSWORD_MIN_LENGTH} characters, with a letter and a number. Generated passwords are longer and stronger.`,
  newPassword:
    `Use at least ${NEW_PASSWORD_MIN_LENGTH} characters with a letter and a number.`,
} as const;
