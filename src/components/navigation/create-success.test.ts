import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const CREATE_FORMS: Array<{
  file: string;
  listHref: string;
  detailPushForbidden: RegExp;
}> = [
  {
    file: "components/master-data/VendorForms.tsx",
    listHref: "/app/vendors",
    detailPushForbidden: /router\.push\(`\/app\/vendors\/\$\{/,
  },
  {
    file: "components/master-data/SupplierForms.tsx",
    listHref: "/app/suppliers",
    detailPushForbidden: /router\.push\(`\/app\/suppliers\/\$\{/,
  },
  {
    file: "components/master-data/DriverForms.tsx",
    listHref: "/app/drivers",
    detailPushForbidden: /router\.push\(`\/app\/drivers\/\$\{/,
  },
  {
    file: "components/master-data/CategoryForms.tsx",
    listHref: "/app/categories",
    detailPushForbidden: /router\.push\(`\/app\/categories\/\$\{/,
  },
  {
    file: "components/master-data/ProductForms.tsx",
    listHref: "/app/products",
    detailPushForbidden: /router\.push\(`\/app\/products\/\$\{/,
  },
  {
    file: "components/purchasing/PurchaseForm.tsx",
    listHref: "/app/purchasing",
    detailPushForbidden: /router\.push\(`\/app\/purchasing\/\$\{/,
  },
  {
    file: "components/supplies/SupplyForm.tsx",
    listHref: "/app/supplies",
    detailPushForbidden: /router\.push\(`\/app\/supplies\/\$\{/,
  },
  {
    file: "components/returns/RecordReturnForm.tsx",
    listHref: "/app/returns",
    detailPushForbidden: /router\.push\(`\/app\/returns\/\$\{/,
  },
];

describe("Phase 1 create success navigation helper", () => {
  it("toasts then navigates via NavigationProgress.run to a listing", () => {
    const helper = read("components/navigation/create-success.ts");
    assert.match(helper, /useCreateSuccessNavigation/);
    assert.match(helper, /useCreateWritePending/);
    assert.match(helper, /toast\.success/);
    assert.match(helper, /nav\.run/);
    assert.match(helper, /router\.push\(listHref\)/);
    assert.match(helper, /lockRef/);
    assert.match(helper, /setPending\(true\)/);
    assert.match(helper, /setPending\(false\)/);
  });

  it("routes successful creates to listing pages, not detail pages", () => {
    for (const entry of CREATE_FORMS) {
      const source = read(entry.file);
      assert.match(
        source,
        /useCreateSuccessNavigation/,
        `${entry.file} should use shared create success navigation`,
      );
      assert.match(
        source,
        /useCreateWritePending/,
        `${entry.file} should use write-only pending`,
      );
      assert.match(
        source,
        new RegExp(`listHref:\\s*"${entry.listHref.replace(/\//g, "\\/")}"`),
        `${entry.file} should navigate to ${entry.listHref}`,
      );
      assert.doesNotMatch(
        source,
        entry.detailPushForbidden,
        `${entry.file} must not push to a detail URL after create`,
      );
      // Create success uses completeCreate with listHref + message only.
      assert.match(
        source,
        /completeCreate\(\{\s*listHref:\s*"[^"]+",\s*message:/,
      );
    }
  });

  it("keeps submit pending labels and duplicate-submit guards on create flows", () => {
    assert.match(read("components/master-data/VendorForms.tsx"), /Creating vendor…/);
    assert.match(read("components/master-data/ProductForms.tsx"), /Creating product…/);
    assert.match(read("components/purchasing/PurchaseForm.tsx"), /Receiving purchase…/);
    assert.match(read("components/supplies/SupplyForm.tsx"), /Recording supply…/);
    assert.match(read("components/returns/RecordReturnForm.tsx"), /Recording return…/);

    for (const entry of CREATE_FORMS) {
      const source = read(entry.file);
      assert.match(
        source,
        /runWrite\(/,
        `${entry.file} should run creates through runWrite`,
      );
      assert.match(
        source,
        /LoadingButton/,
        `${entry.file} should show LoadingButton pending UI`,
      );
    }
  });

  it("does not toast success or navigate on failed creates", () => {
    for (const entry of CREATE_FORMS) {
      const source = read(entry.file);
      assert.match(source, /toast\.error/);
      assert.match(source, /!result\.ok/);
      // Success path uses completeCreate; failures return before it.
      const failBlock = source.split("if (!result.ok)")[1] ?? "";
      const failReturn = failBlock.slice(0, failBlock.indexOf("return;") + 7);
      assert.doesNotMatch(failReturn, /completeCreate/);
      assert.doesNotMatch(failReturn, /toast\.success/);
    }
  });
});

describe("Phase 1 user create temporary password reveal", () => {
  const createUser = read("components/admin/CreateUserForm.tsx");

  it("shows Creating account pending and prevents duplicate writes", () => {
    assert.match(createUser, /Creating account…/);
    assert.match(createUser, /useCreateWritePending/);
    assert.match(createUser, /runWrite\(/);
    assert.match(createUser, /pending=\{pending\}/);
  });

  it("reveals temporary password only after successful create, then Continue to Users", () => {
    assert.match(createUser, /Account created/);
    assert.match(createUser, /Copy Password/);
    assert.match(createUser, /Continue to Users/);
    assert.match(createUser, /temporary-password-reveal/);
    assert.match(createUser, /navigator\.clipboard\.writeText/);
    assert.match(createUser, /must change it on first login/);
    assert.match(createUser, /router\.push\("\/app\/admin\/users"\)/);
    assert.doesNotMatch(
      createUser,
      /router\.push\(`\/app\/admin\/users\/\$\{result\.user\.id\}`\)/,
    );
  });

  it("never puts the temporary password in URL, storage, or logs", () => {
    assert.doesNotMatch(createUser, /localStorage|sessionStorage/);
    assert.doesNotMatch(createUser, /console\.(log|info|debug|warn|error).*[Pp]assword/);
    assert.doesNotMatch(
      createUser,
      /router\.push\([^)]*temporaryPassword|searchParams.*[Pp]assword|password=/,
    );
    // Password lives only in React state for the reveal dialog.
    assert.match(createUser, /temporaryPassword/);
    assert.match(createUser, /setCreated\(/);
  });

  it("preserves partial-provisioning recovery without success password UI", () => {
    assert.match(createUser, /result\.userId/);
    assert.match(createUser, /finish activation/);
    assert.match(createUser, /User not created/);
    assert.match(createUser, /setCreated\(null\)/);
    assert.match(
      createUser,
      /router\.push\(`\/app\/admin\/users\/\$\{result\.userId\}`\)/,
    );
  });
});

describe("Phase 1 edit and operational mutations stay on-page", () => {
  it("keeps edit forms using transitions without list redirects after save", () => {
    const vendorEdit = read("components/master-data/VendorForms.tsx");
    assert.match(vendorEdit, /export function EditVendorForm/);
    assert.match(vendorEdit, /startTransition\(async/);
    assert.match(vendorEdit, /Saving changes…|Saving…/);

    const adjust = read("components/inventory/AdjustInventoryForm.tsx");
    assert.match(adjust, /startTransition\(async/);
    assert.match(adjust, /toast\.success/);
    assert.doesNotMatch(adjust, /router\.push/);

    const deliveryStatus = read("components/deliveries/UpdateStatusForm.tsx");
    assert.match(deliveryStatus, /startTransition\(async/);
    assert.doesNotMatch(deliveryStatus, /listHref/);
  });
});
