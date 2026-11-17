import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUserSchema } from "@/lib/admin/users/schemas";
import {
  passwordChangeFormSchema,
  signInCredentialsSchema,
} from "@/lib/auth/validation";
import {
  NEW_PASSWORD_MIN_LENGTH,
  TEMP_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

describe("sign-in vs password-creation validation", () => {
  it("accepts an existing six-character password at the sign-in layer", () => {
    const result = signInCredentialsSchema.safeParse({
      email: "staff@example.com",
      password: "abc123",
    });
    assert.equal(result.success, true);
  });

  it("rejects an empty sign-in password", () => {
    const result = signInCredentialsSchema.safeParse({
      email: "staff@example.com",
      password: "",
    });
    assert.equal(result.success, false);
  });

  it("keeps create-user temporary password at six characters", () => {
    assert.equal(TEMP_PASSWORD_MIN_LENGTH, 6);
    const result = createUserSchema.safeParse({
      fullName: "Ops Staff",
      email: "staff@example.com",
      phone: "",
      role: "STAFF",
      temporaryPassword: "abc123",
    });
    assert.equal(result.success, true);
  });

  it("requires stronger new passwords on change", () => {
    assert.equal(NEW_PASSWORD_MIN_LENGTH, 8);
    const tooShort = passwordChangeFormSchema.safeParse({
      currentPassword: "abc123",
      newPassword: "short1",
      confirmPassword: "short1",
    });
    assert.equal(tooShort.success, false);

    const ok = passwordChangeFormSchema.safeParse({
      currentPassword: "abc123",
      newPassword: "NewPass12",
      confirmPassword: "NewPass12",
    });
    assert.equal(ok.success, true);
  });
});
