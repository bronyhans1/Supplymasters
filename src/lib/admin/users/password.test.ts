import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUserSchema } from "@/lib/admin/users/schemas";
import {
  generateTemporaryPassword,
  TEMP_PASSWORD_GENERATED_LENGTH,
  TEMP_PASSWORD_MIN_LENGTH,
} from "@/lib/admin/users/password";

describe("temporary password policy", () => {
  it("accepts a six-character password with a letter and number", () => {
    const result = createUserSchema.safeParse({
      fullName: "Ops Staff",
      email: "staff@example.com",
      phone: "",
      role: "STAFF",
      temporaryPassword: "abc123",
    });
    assert.equal(result.success, true);
  });

  it("rejects passwords shorter than six characters", () => {
    const result = createUserSchema.safeParse({
      fullName: "Ops Staff",
      email: "staff@example.com",
      phone: "",
      role: "STAFF",
      temporaryPassword: "ab12",
    });
    assert.equal(result.success, false);
  });

  it("generates a strong password without logging", () => {
    assert.equal(TEMP_PASSWORD_MIN_LENGTH, 6);
    const password = generateTemporaryPassword();
    assert.equal(password.length, TEMP_PASSWORD_GENERATED_LENGTH);
    assert.match(password, /[A-Za-z]/);
    assert.match(password, /[0-9]/);
    const again = generateTemporaryPassword();
    // Extremely unlikely to collide; catches a broken constant generator.
    assert.notEqual(password, again);
  });
});
