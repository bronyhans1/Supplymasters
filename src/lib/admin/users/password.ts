/**
 * Temporary password helpers for administrator account provisioning.
 * Never log generated values.
 */

import {
  TEMP_PASSWORD_GENERATED_LENGTH,
  TEMP_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

export {
  TEMP_PASSWORD_GENERATED_LENGTH,
  TEMP_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

/** Alphabet for generated temps — avoids ambiguous characters (0/O, 1/l/I). */
const GENERATED_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Cryptographically secure temporary password.
 * Guarantees at least one letter and one digit for app validation.
 */
export function generateTemporaryPassword(
  length = TEMP_PASSWORD_GENERATED_LENGTH,
): string {
  const size = Math.max(length, TEMP_PASSWORD_MIN_LENGTH);
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);

  const chars = Array.from(
    bytes,
    (byte) => GENERATED_ALPHABET[byte % GENERATED_ALPHABET.length],
  );

  const letterIndex = bytes[0]! % (size - 1);
  const digitIndex = (letterIndex + 1 + (bytes[1]! % (size - 1))) % size;
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  chars[letterIndex] = letters[bytes[2]! % letters.length]!;
  chars[digitIndex] = digits[bytes[3]! % digits.length]!;

  return chars.join("");
}
