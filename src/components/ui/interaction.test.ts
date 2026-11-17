import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

describe("confirmation and loading UX", () => {
  it("provides branded ConfirmDialog and toast infrastructure", () => {
    const dialog = readFileSync(join(root, "components/ui/ConfirmDialog.tsx"), "utf8");
    const toast = readFileSync(join(root, "components/ui/ToastProvider.tsx"), "utf8");
    const providers = readFileSync(join(root, "components/Providers.tsx"), "utf8");
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");

    assert.match(dialog, /role="alertdialog"/);
    assert.match(dialog, /variant\?: ConfirmVariant/);
    assert.match(dialog, /pending/);
    assert.match(dialog, /Escape/);
    assert.match(toast, /tone\?: ToastTone/);
    assert.match(toast, /aria-live="polite"/);
    assert.match(providers, /ToastProvider/);
    assert.match(layout, /Providers/);
  });

  it("replaces native confirmations for purchase and admin actions", () => {
    const purchase = readFileSync(
      join(root, "components/purchasing/PurchaseForm.tsx"),
      "utf8",
    );
    const users = readFileSync(
      join(root, "components/admin/UserManagePanel.tsx"),
      "utf8",
    );
    const status = readFileSync(
      join(root, "components/master-data/StatusToggleButton.tsx"),
      "utf8",
    );

    assert.doesNotMatch(purchase, /window\.confirm/);
    assert.doesNotMatch(users, /window\.confirm/);
    assert.doesNotMatch(status, /window\.confirm/);
    assert.match(purchase, /ConfirmDialog/);
    assert.match(purchase, /clientRequestId/);
    assert.match(purchase, /Receiving purchase/);
    assert.match(purchase, /increases inventory immediately/);
    assert.match(users, /ConfirmDialog/);
    assert.match(status, /ConfirmDialog/);
  });

  it("keeps purchase request id stable across retries", () => {
    const purchase = readFileSync(
      join(root, "components/purchasing/PurchaseForm.tsx"),
      "utf8",
    );
    assert.match(purchase, /useState\(\(\) => createUuid\(\)\)/);
    assert.match(purchase, /import \{ createUuid \} from "@\/lib\/utils\/id"/);
    assert.match(purchase, /Keep clientRequestId so a retry/);
    assert.doesNotMatch(purchase, /crypto\.randomUUID/);
    assert.doesNotMatch(
      purchase,
      /setClientRequestId|clientRequestId\s*=\s*createUuid/,
    );
  });

  it("uses descriptive pending labels on key mutations", () => {
    const product = readFileSync(
      join(root, "components/master-data/ProductForms.tsx"),
      "utf8",
    );
    const createUser = readFileSync(
      join(root, "components/admin/CreateUserForm.tsx"),
      "utf8",
    );
    assert.match(product, /Creating product…/);
    assert.match(product, /Saving changes…/);
    assert.match(createUser, /Creating account…/);
  });
});
