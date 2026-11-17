import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryUpdateSchema,
  categoryWriteSchema,
  listCategoriesQuerySchema,
  setCategoryActiveSchema,
} from "./schemas";

describe("product category schemas", () => {
  it("trims names and rejects blanks", () => {
    const blank = categoryWriteSchema.safeParse({ name: "   " });
    assert.equal(blank.success, false);

    const good = categoryWriteSchema.safeParse({ name: "  Noodles  " });
    assert.equal(good.success, true);
    if (good.success) {
      assert.equal(good.data.name, "Noodles");
      assert.equal(good.data.is_active, true);
    }
  });

  it("requires an id for updates and status changes", () => {
    const update = categoryUpdateSchema.safeParse({
      id: "not-a-uuid",
      name: "Water",
    });
    assert.equal(update.success, false);

    const status = setCategoryActiveSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      isActive: false,
    });
    assert.equal(status.success, true);
  });

  it("parses list filters", () => {
    const parsed = listCategoriesQuerySchema.parse({
      q: "  nood  ",
      status: "ACTIVE",
      page: "2",
    });
    assert.equal(parsed.q, "nood");
    assert.equal(parsed.status, "ACTIVE");
    assert.equal(parsed.page, 2);
  });
});
