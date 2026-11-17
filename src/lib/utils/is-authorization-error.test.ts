import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "@/lib/utils/errors";
import { isAuthorizationError } from "@/lib/utils/is-authorization-error";

describe("isAuthorizationError", () => {
  it("recognizes FORBIDDEN AppError and legacy permission messages", () => {
    assert.equal(
      isAuthorizationError(
        new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."),
      ),
      true,
    );
    assert.equal(
      isAuthorizationError(
        new AppError(403, "REPORTS_FORBIDDEN", "You do not have permission to view management reports."),
      ),
      true,
    );
    assert.equal(
      isAuthorizationError(
        new Error("You do not have permission to perform this action."),
      ),
      true,
    );
  });

  it("does not misclassify unexpected server errors as authorization denials", () => {
    assert.equal(
      isAuthorizationError(new AppError(500, "INTERNAL", "Database unavailable.")),
      false,
    );
    assert.equal(
      isAuthorizationError(new AppError(401, "UNAUTHENTICATED", "Authentication is required.")),
      false,
    );
    assert.equal(
      isAuthorizationError(new Error("Unable to load dashboard metrics.")),
      false,
    );
    assert.equal(isAuthorizationError(null), false);
    assert.equal(isAuthorizationError("FORBIDDEN"), false);
  });
});
