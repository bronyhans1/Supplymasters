import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(full));
    else files.push(full);
  }
  return files;
}

describe("returns integrity safeguards", () => {
  it("records returns only through record_delivery_stock_return RPC", () => {
    const actions = readSrc("src/lib/returns/actions.ts");
    assert.match(actions, /rpc\(\s*["']record_delivery_stock_return["']/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
    assert.doesNotMatch(
      actions,
      /\.from\(\s*["']delivery_stock_returns["']\s*\)\s*\.insert/,
    );
    assert.doesNotMatch(
      actions,
      /\.from\(\s*["']delivery_stock_return_items["']\s*\)\s*\.insert/,
    );
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.update/);
    assert.doesNotMatch(
      actions,
      /\.from\(\s*["']stock_movements["']\s*\)\s*\.insert/,
    );
    assert.doesNotMatch(actions, /apply_stock_movement/);
  });

  it("keeps return module mutations limited to the approved action", () => {
    const files = [
      ...listFilesRecursive(path.join(root, "src/lib/returns")),
      ...listFilesRecursive(path.join(root, "src/components/returns")),
    ]
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .filter((file) => !file.endsWith(".test.ts"));

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(
        source,
        /\.from\(\s*["']delivery_stock_returns["']\s*\)\s*\.(insert|update|delete)/,
      );
      assert.doesNotMatch(
        source,
        /\.from\(\s*["']delivery_stock_return_items["']\s*\)\s*\.(insert|update|delete)/,
      );
    }
  });

  it("keeps delivery status updates free of automatic restocking", () => {
    const deliveryActions = readSrc("src/lib/deliveries/actions.ts");
    assert.doesNotMatch(deliveryActions, /record_delivery_stock_return/);
    assert.doesNotMatch(deliveryActions, /apply_stock_movement/);
    assert.doesNotMatch(
      deliveryActions,
      /\.from\(\s*["']inventory["']\s*\)\s*\.update/,
    );
  });
});
