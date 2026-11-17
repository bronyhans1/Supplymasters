import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const categoriesMigration = join(
  process.cwd(),
  "supabase/migrations/20261111000100_product_categories.sql",
);
const smMigration = join(
  process.cwd(),
  "supabase/migrations/20261111000200_sm_business_code_prefixes.sql",
);
const verifySql = join(
  process.cwd(),
  "supabase/tests/g_product_categories_sm_prefixes_verify.sql",
);

describe("Phase G Stage 1 migration contracts", () => {
  const categoriesSql = readFileSync(categoriesMigration, "utf8");
  const smSql = readFileSync(smMigration, "utf8");
  const verify = readFileSync(verifySql, "utf8");

  it("creates product_categories with case-insensitive unique names, RLS, and category_id cutover", () => {
    assert.match(categoriesSql, /^BEGIN;/m);
    assert.match(categoriesSql, /^COMMIT;/m);
    assert.match(categoriesSql, /CREATE TABLE public\.product_categories/);
    assert.match(
      categoriesSql,
      /CREATE UNIQUE INDEX product_categories_name_lower_key[\s\S]*lower\(btrim\(name\)\)/,
    );
    assert.match(categoriesSql, /product_categories_insert_admin/);
    assert.match(categoriesSql, /product_categories_update_admin/);
    assert.match(categoriesSql, /product_categories_delete_blocked/);
    assert.match(categoriesSql, /ADD COLUMN IF NOT EXISTS category_id uuid/);
    assert.match(categoriesSql, /ALTER COLUMN category_id SET NOT NULL/);
    assert.match(categoriesSql, /DISTINCT ON \(name_key\)/);
    assert.match(categoriesSql, /usage_count DESC, trimmed_name ASC/);
    assert.match(categoriesSql, /products_sync_category_name/);
    assert.match(categoriesSql, /products_enforce_active_category/);
    assert.match(categoriesSql, /Inactive product categories cannot be assigned/);
    assert.match(
      categoriesSql,
      /REVOKE INSERT, UPDATE ON TABLE public\.products FROM authenticated/,
    );
    assert.match(
      categoriesSql,
      /REVOKE INSERT \(category\), UPDATE \(category\) ON TABLE public\.products FROM authenticated/,
    );
    assert.match(categoriesSql, /GRANT INSERT \([\s\S]*category_id/);
    assert.match(
      categoriesSql,
      /has_column_privilege\('authenticated', 'public\.products', 'category'/,
    );
    assert.match(categoriesSql, /PRODUCT_CATEGORY_CREATED/);
    assert.match(categoriesSql, /audit_product_category_row/);
    assert.doesNotMatch(categoriesSql, /product_brands/);
    assert.match(categoriesSql, /Do not apply automatically/);
  });

  it("switches issuance to SM-* while dual-accepting legacy NM-* codes", () => {
    assert.match(smSql, /^BEGIN;/m);
    assert.match(smSql, /^COMMIT;/m);
    assert.match(smSql, /last_value is intentionally preserved/);
    assert.match(smSql, /SET prefix = 'SM-PRD-' WHERE name = 'product'/);
    assert.match(smSql, /SET prefix = 'SM-VND-' WHERE name = 'vendor'/);
    assert.match(smSql, /SET prefix = 'SM-SUP-' WHERE name = 'supplier'/);
    assert.match(smSql, /SET prefix = 'SM-DRV-' WHERE name = 'driver'/);
    assert.match(smSql, /SET prefix = 'SM-SPL-' WHERE name = 'supply'/);
    assert.match(smSql, /SET prefix = 'SM-PAY-' WHERE name = 'payment'/);
    assert.match(smSql, /SET prefix = 'SM-DLV-' WHERE name = 'delivery'/);
    assert.match(smSql, /SET prefix = 'SM-PUR-' WHERE name = 'purchase'/);
    assert.match(smSql, /SET prefix = 'SM-RET-' WHERE name = 'return'/);
    assert.doesNotMatch(smSql, /SET last_value\s*=\s*0/);
    assert.match(smSql, /\^\(NM\|SM\)-PRD-\[0-9\]\{6\}\$/);
    assert.match(smSql, /\^\(NM\|SM\)-VND-\[0-9\]\{6\}\$/);
    assert.match(smSql, /expected SM-RET-######/);
    assert.doesNotMatch(smSql, /DELETE FROM public\.(products|vendors)/);
    assert.doesNotMatch(smSql, /TRUNCATE/);
    assert.match(smSql, /Do not apply automatically/);
  });

  it("ships a Stage 1 verification script covering cutover, privileges, and dual prefixes", () => {
    assert.match(verify, /read-only asserts; no data mutation/);
    assert.match(verify, /product_categories_name_lower_key/);
    assert.match(verify, /case-insensitive duplicate category/);
    assert.match(verify, /products missing category_id/);
    assert.match(verify, /products_category_id_fkey/);
    assert.match(verify, /category text drift/);
    assert.match(verify, /relrowsecurity/);
    assert.match(verify, /product_categories_audit_after_write/);
    assert.match(verify, /products_sync_category_name_before_write/);
    assert.match(verify, /products_enforce_active_category_before_write/);
    assert.match(verify, /has_table_privilege\('authenticated', 'public\.products'/);
    assert.match(
      verify,
      /has_column_privilege\('authenticated', 'public\.products', 'category'/,
    );
    assert.match(
      verify,
      /has_column_privilege\('authenticated', 'public\.products', 'category_id'/,
    );
    assert.match(verify, /expected 9 SM code_sequences/);
    assert.match(verify, /expected 9 dual-prefix CHECKs/);
    assert.match(verify, /\(NM\|SM\)-PRD-/);
    assert.match(verify, /Phase G Stage 1 verification PASSED/);
    assert.doesNotMatch(verify, /\bINSERT\s+INTO\b/i);
    assert.doesNotMatch(verify, /\bDELETE\s+FROM\b/i);
    assert.doesNotMatch(verify, /\bTRUNCATE\b/i);
    assert.doesNotMatch(verify, /\bUPDATE\s+public\./i);
  });
});
