import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Phase D — user provisioning recovery", () => {
  const actions = read("src/lib/admin/users/actions.ts");
  const schemas = read("src/lib/admin/users/schemas.ts");
  const panel = read("src/components/admin/UserManagePanel.tsx");
  const createForm = read("src/components/admin/CreateUserForm.tsx");
  const provision = read("src/lib/admin/users/provision.ts");

  const recoveryFn = actions.slice(
    actions.indexOf("export async function completeManagedUserProvisioning"),
  );

  it("exposes completeManagedUserProvisioning without password handling", () => {
    assert.match(actions, /export async function completeManagedUserProvisioning/);
    assert.match(schemas, /completeUserProvisioningSchema/);
    assert.match(panel, /Finish provisioning/);
    assert.match(panel, /completeManagedUserProvisioning/);
    assert.doesNotMatch(actions, /temporaryPassword/);
    assert.doesNotMatch(schemas, /completeUserProvisioningSchema[\s\S]*temporaryPassword/);
    assert.match(provision, /Never logs the temporary password/);
  });

  it("marks partial create failures for recovery", () => {
    assert.match(actions, /partial: true/);
    assert.match(actions, /Finish provisioning before delivering credentials/);
    assert.match(createForm, /Partial provisioning: recover on detail/);
    assert.match(createForm, /router\.push\(`\/app\/admin\/users\/\$\{result\.userId\}`\)/);
    assert.match(createForm, /setPassword\(""\)/);
    assert.doesNotMatch(createForm, /router\.push\([^)]*temporaryPassword/);
  });

  it("recovery cannot create Auth users and stays ADMIN-gated", () => {
    assert.match(recoveryFn, /await requireAdmin\(\)/);
    assert.doesNotMatch(recoveryFn, /createAuthUserForAdmin/);
    assert.doesNotMatch(recoveryFn, /auth\.admin\.createUser/);
    assert.match(recoveryFn, /assignRoleViaSession/);
    assert.match(panel, /Do not paste temporary passwords into the app/);
  });
});
