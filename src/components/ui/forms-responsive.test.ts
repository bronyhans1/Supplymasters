import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const DIALOG_FORMS = [
  "components/master-data/VendorForms.tsx",
  "components/master-data/DriverForms.tsx",
  "components/master-data/ProductForms.tsx",
  "components/master-data/CategoryForms.tsx",
  "components/master-data/SupplierForms.tsx",
  "components/admin/CreateUserForm.tsx",
] as const;

const CONTROL_FORMS = [
  ...DIALOG_FORMS,
  "components/purchasing/PurchaseForm.tsx",
  "components/supplies/SupplyForm.tsx",
  "components/returns/RecordReturnForm.tsx",
  "components/inventory/AdjustInventoryForm.tsx",
  "components/deliveries/AssignStaffForm.tsx",
  "components/deliveries/AssignDriverForm.tsx",
  "components/deliveries/UpdateStatusForm.tsx",
  "components/admin/UserManagePanel.tsx",
  "components/auth/PasswordField.tsx",
  "components/auth/SignInForm.tsx",
] as const;

describe("Phase 2 Part 3 responsive forms and dialogs", () => {
  it("provides shared form control tokens and FormDialog shell", () => {
    const styles = read("components/ui/form-styles.ts");
    assert.match(styles, /export const formControlClass/);
    assert.match(styles, /min-h-11/);
    assert.match(styles, /text-base/);
    assert.match(styles, /sm:text-sm/);
    assert.match(styles, /formSecondaryButtonClass/);

    const dialog = read("components/ui/FormDialog.tsx");
    assert.match(dialog, /export function FormDialog/);
    assert.match(dialog, /role="dialog"/);
    assert.match(dialog, /aria-modal="true"/);
    assert.match(dialog, /Escape/);
    assert.match(dialog, /safe-area-inset-bottom/);
    assert.match(dialog, /dismissible/);
    assert.match(dialog, /sticky|shrink-0 border-t/);
    assert.match(dialog, /items-end/);
    assert.match(dialog, /sm:items-center/);
    // Mobile scroll: height-capped panel + only the body scrolls (iOS LAN/Safari).
    assert.match(dialog, /max-h-\[90dvh\]/);
    assert.match(dialog, /overflow-y-auto/);
    assert.match(dialog, /overscroll-y-contain/);
    assert.match(dialog, /min-h-0 flex-1 flex-col overflow-hidden/);
    assert.match(dialog, /position = "fixed"/);
    assert.doesNotMatch(dialog, /max-h-\[min\(92dvh,100%\)\]/);

    const actionBar = read("components/ui/FormActionBar.tsx");
    assert.match(actionBar, /export function FormActionBar/);
    assert.match(actionBar, /sticky bottom-0/);
    assert.match(actionBar, /safe-area-inset-bottom/);
  });

  it("keeps ConfirmDialog and LoadingButton touch-friendly", () => {
    const confirm = read("components/ui/ConfirmDialog.tsx");
    assert.match(confirm, /role="alertdialog"/);
    assert.match(confirm, /min-h-11/);
    assert.match(confirm, /safe-area-inset-bottom/);
    assert.match(confirm, /flex-col-reverse/);

    const button = read("components/ui/LoadingButton.tsx");
    assert.match(button, /min-h-11/);
  });

  it("routes create/edit dialogs through FormDialog without local overlays", () => {
    for (const file of DIALOG_FORMS) {
      const source = read(file);
      assert.match(source, /FormDialog/, `${file} should use FormDialog`);
      assert.doesNotMatch(
        source,
        /fixed inset-0 z-50/,
        `${file} should not keep a local modal overlay`,
      );
    }
  });

  it("preserves non-dismissible temporary password reveal after user create", () => {
    const createUser = read("components/admin/CreateUserForm.tsx");
    assert.match(createUser, /dismissible=\{false\}/);
    assert.match(createUser, /temporaryPassword|Temporary password/);
    assert.match(createUser, /Continue to Users|Continue/);
    assert.match(createUser, /Creating account…/);
  });

  it("applies shared control classes across forms and auth chrome", () => {
    for (const file of CONTROL_FORMS) {
      const source = read(file);
      assert.match(
        source,
        /formControlClass|formControlPaperClass|formControlSurfaceClass/,
        `${file} should use shared form control classes`,
      );
    }
  });

  it("keeps long operational forms usable on mobile with sticky actions and line cards", () => {
    const purchase = read("components/purchasing/PurchaseForm.tsx");
    assert.match(purchase, /FormActionBar/);
    assert.match(purchase, /lg:hidden/);
    assert.match(purchase, /hidden[\s\S]*lg:block/);
    assert.match(purchase, /ConfirmDialog/);

    const supply = read("components/supplies/SupplyForm.tsx");
    assert.match(supply, /FormActionBar/);
    assert.match(supply, /lg:hidden/);
    assert.match(supply, /ConfirmDialog/);

    const returns = read("components/returns/RecordReturnForm.tsx");
    assert.match(returns, /FormActionBar/);
    assert.match(returns, /lg:hidden/);
    assert.match(returns, /ConfirmDialog/);
  });
});
