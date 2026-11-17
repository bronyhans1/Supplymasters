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

describe("payments read-only integrity", () => {
  it("does not introduce a payments actions module", () => {
    assert.equal(existsSync(path.join(root, "src/lib/payments/actions.ts")), false);
  });

  it("keeps payments module free of create/update/delete mutations", () => {
    const paymentsDir = path.join(root, "src/lib/payments");
    const componentDir = path.join(root, "src/components/payments");
    const pageDir = path.join(root, "src/app/app/payments");
    const sources = [...listFilesRecursive(paymentsDir), ...listFilesRecursive(componentDir), ...listFilesRecursive(pageDir)]
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .filter((file) => !file.endsWith(".test.ts"));

    assert.ok(sources.length > 0);

    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /\.from\(\s*["']payments["']\s*\)\s*\.insert/);
      assert.doesNotMatch(source, /\.from\(\s*["']payments["']\s*\)\s*\.update/);
      assert.doesNotMatch(source, /\.from\(\s*["']payments["']\s*\)\s*\.delete/);
      assert.doesNotMatch(source, /rpc\(\s*["']record_full_payment["']/);
      assert.doesNotMatch(source, /rpc\(\s*["']create_supply_transaction["']/);
    }
  });

  it("preserves supply payment creation through create_supply_transaction only", () => {
    const actions = readSrc("src/lib/supplies/actions.ts");
    assert.match(actions, /rpc\(\s*["']create_supply_transaction["']/);
    assert.doesNotMatch(actions, /\.from\(\s*["']payments["']\s*\)\s*\.insert/);
  });
});
