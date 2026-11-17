import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("supplies integrity safeguards", () => {
  it("creates paid supplies only through create_supply_transaction RPC", () => {
    const actions = readSrc("src/lib/supplies/actions.ts");
    assert.match(actions, /rpc\(\s*["']create_supply_transaction["']/);
    assert.doesNotMatch(actions, /record_full_payment/);
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.update/);
    assert.doesNotMatch(actions, /\.from\(\s*["']stock_movements["']\s*\)\s*\.insert/);
    assert.doesNotMatch(actions, /\.from\(\s*["']payments["']\s*\)\s*\.insert/);
    assert.doesNotMatch(actions, /\.from\(\s*["']supplies["']\s*\)\s*\.insert/);
  });

  it("keeps purchasing and inventory adjustment paths intact", () => {
    const purchasing = readSrc("src/lib/purchasing/actions.ts");
    const inventory = readSrc("src/lib/inventory/actions.ts");
    assert.match(purchasing, /receive_stock_purchase/);
    assert.match(inventory, /adjust_inventory/);
  });
});
