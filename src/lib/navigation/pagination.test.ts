import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPageHref } from "@/lib/navigation/pagination";

describe("buildPageHref", () => {
  it("builds the first page while preserving filters", () => {
    assert.equal(
      buildPageHref("/app/audit-logs", 1, {
        q: "stock",
        action: "UPDATE",
        page: "9",
      }),
      "/app/audit-logs?q=stock&action=UPDATE&page=1",
    );
  });

  it("builds previous and next page boundaries", () => {
    const params = { status: "ACTIVE", q: "wire" };
    assert.equal(
      buildPageHref("/app/products", 1, params),
      "/app/products?status=ACTIVE&q=wire&page=1",
    );
    assert.equal(
      buildPageHref("/app/products", 2, params),
      "/app/products?status=ACTIVE&q=wire&page=2",
    );
    assert.equal(
      buildPageHref("/app/products", 8, params),
      "/app/products?status=ACTIVE&q=wire&page=8",
    );
  });

  it("omits empty and ALL sentinel values", () => {
    assert.equal(
      buildPageHref("/app/admin/users", 3, {
        q: "",
        role: "ALL",
        status: "ACTIVE",
        ignored: ["array", "values"],
      }),
      "/app/admin/users?status=ACTIVE&page=3",
    );
  });

  it("supports extra omit keys", () => {
    assert.equal(
      buildPageHref(
        "/app/reports",
        2,
        { section: "overview", page: "1", draft: "yes" },
        { omitKeys: ["draft"] },
      ),
      "/app/reports?section=overview&page=2",
    );
  });

  it("lives in a server-safe module, not a client component file", () => {
    const util = readFileSync(
      join(process.cwd(), "src/lib/navigation/pagination.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(process.cwd(), "src/components/ui/PaginationLink.tsx"),
      "utf8",
    );
    assert.doesNotMatch(util, /^["']use client["']/m);
    assert.doesNotMatch(client, /export function buildPageHref/);
  });
});
