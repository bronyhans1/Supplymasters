import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapReturnRpcError } from "@/lib/returns/db-errors";

describe("mapReturnRpcError", () => {
  it("maps status, quantity, conflict, and product validation failures", () => {
    assert.equal(
      mapReturnRpcError({
        message: "This request id was already used for a different stock return.",
      }).code,
      "REQUEST_CONFLICT",
    );
    assert.equal(
      mapReturnRpcError({
        message: "Stock returns are only allowed for FAILED or CANCELLED deliveries.",
      }).code,
      "INVALID_DELIVERY_STATUS",
    );
    assert.equal(
      mapReturnRpcError({
        message:
          "Return quantity 5 exceeds remaining quantity 2 for product abc (original 3, already returned 1).",
      }).code,
      "QUANTITY_EXCEEDED",
    );
    assert.equal(
      mapReturnRpcError({
        message: "Returned product abc was not part of the original supply.",
      }).code,
      "INVALID_PRODUCT",
    );
    assert.equal(
      mapReturnRpcError({
        message: "Duplicate product lines are not allowed in a single return request.",
      }).code,
      "DUPLICATE_PRODUCT",
    );
  });
});
