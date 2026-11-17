import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listAuditLogsQuerySchema } from "./schemas";

describe("listAuditLogsQuerySchema", () => {
  it("defaults empty filters and page 1", () => {
    const parsed = listAuditLogsQuerySchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.q, "");
    assert.equal(parsed.action, "");
    assert.equal(parsed.entityId, "");
  });

  it("rejects inverted date ranges", () => {
    assert.throws(() =>
      listAuditLogsQuerySchema.parse({
        fromDate: "2026-03-10",
        toDate: "2026-03-01",
      }),
    );
  });

  it("accepts a valid entity UUID", () => {
    const parsed = listAuditLogsQuerySchema.parse({
      entityId: "b0f76ca7-3b8f-4abe-8ad3-e09aa3c1062c",
    });
    assert.equal(parsed.entityId, "b0f76ca7-3b8f-4abe-8ad3-e09aa3c1062c");
  });
});
