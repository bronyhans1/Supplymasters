import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ENV_VAR,
  assertProductionRuntimeEnv,
  formatMissingEnvError,
  isNextProductionBuild,
  missingAdminSupabaseEnvVars,
  missingProductionRuntimeEnvVars,
  missingPublicSupabaseEnvVars,
  resolveEnv,
  type EnvSource,
} from "./env";

const SECRET_VALUE = "super-secret-service-role-key-do-not-leak";
const PUBLISHABLE_VALUE = "sb_publishable_test_key";

function completeProductionSource(
  overrides: EnvSource = {},
): EnvSource {
  return {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_VALUE,
    SUPABASE_SECRET_KEY: SECRET_VALUE,
    ...overrides,
  };
}

describe("resolveEnv", () => {
  it("trims values and reports soft capability flags", () => {
    const resolved = resolveEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "  https://example.supabase.co  ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `  ${PUBLISHABLE_VALUE}  `,
      SUPABASE_SECRET_KEY: "",
    });

    assert.equal(resolved.isProduction, false);
    assert.equal(resolved.isProductionBuild, false);
    assert.equal(resolved.supabaseUrl, "https://example.supabase.co");
    assert.equal(resolved.hasPublicSupabaseConfig, true);
    assert.equal(resolved.hasSecretKey, false);
  });

  it("treats whitespace-only values as absent", () => {
    const resolved = resolveEnv({
      NEXT_PUBLIC_SUPABASE_URL: "   ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "\t",
      SUPABASE_SECRET_KEY: " \n ",
    });

    assert.equal(resolved.hasPublicSupabaseConfig, false);
    assert.equal(resolved.hasSecretKey, false);
    assert.deepEqual(missingProductionRuntimeEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: "   ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "\t",
      SUPABASE_SECRET_KEY: " \n ",
    }), [
      ENV_VAR.supabaseUrl,
      ENV_VAR.supabasePublishableKey,
      ENV_VAR.supabaseSecretKey,
    ]);
  });
});

describe("production runtime fail-fast", () => {
  it("passes when all required production variables are present", () => {
    assert.doesNotThrow(() =>
      assertProductionRuntimeEnv(completeProductionSource()),
    );
    assert.deepEqual(
      missingProductionRuntimeEnvVars(completeProductionSource()),
      [],
    );
  });

  it("fails for each required production variable when missing", () => {
    const required = [
      ENV_VAR.supabaseUrl,
      ENV_VAR.supabasePublishableKey,
      ENV_VAR.supabaseSecretKey,
    ] as const;

    for (const name of required) {
      const source = completeProductionSource({ [name]: undefined });
      const missing = missingProductionRuntimeEnvVars(source);
      assert.ok(missing.includes(name), `expected ${name} in ${missing.join(",")}`);

      assert.throws(
        () => assertProductionRuntimeEnv(source),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(error.message, new RegExp(name));
          assert.doesNotMatch(error.message, new RegExp(SECRET_VALUE));
          assert.doesNotMatch(error.message, new RegExp(PUBLISHABLE_VALUE));
          return true;
        },
      );
    }
  });

  it("fails when required variables are blank or whitespace-only", () => {
    assert.throws(
      () =>
        assertProductionRuntimeEnv(
          completeProductionSource({
            SUPABASE_SECRET_KEY: "   ",
            NEXT_PUBLIC_SUPABASE_URL: "\t\n",
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
        assert.match(error.message, /SUPABASE_SECRET_KEY/);
        assert.doesNotMatch(error.message, /super-secret/);
        return true;
      },
    );
  });

  it("does not require production-only secrets in development", () => {
    const source: EnvSource = {
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_VALUE,
      // SUPABASE_SECRET_KEY intentionally absent
    };

    assert.doesNotThrow(() => assertProductionRuntimeEnv(source));
    assert.equal(resolveEnv(source).hasSecretKey, false);
    assert.deepEqual(missingPublicSupabaseEnvVars(source), []);
    assert.deepEqual(missingAdminSupabaseEnvVars(source), [
      ENV_VAR.supabaseSecretKey,
    ]);
  });

  it("skips fail-fast during Next production build/export phases", () => {
    assert.equal(
      isNextProductionBuild({ NEXT_PHASE: "phase-production-build" }),
      true,
    );

    assert.doesNotThrow(() =>
      assertProductionRuntimeEnv(
        completeProductionSource({
          NEXT_PHASE: "phase-production-build",
          SUPABASE_SECRET_KEY: undefined,
          NEXT_PUBLIC_SUPABASE_URL: undefined,
        }),
      ),
    );

    assert.doesNotThrow(() =>
      assertProductionRuntimeEnv(
        completeProductionSource({
          NEXT_PHASE: "phase-export",
          SUPABASE_SECRET_KEY: "",
        }),
      ),
    );
  });

  it("keeps bootstrap secrets optional for application runtime", () => {
    const missing = missingProductionRuntimeEnvVars(completeProductionSource());
    assert.equal(missing.includes("SETUP_BOOTSTRAP_SECRET"), false);
    assert.equal(missing.includes("SETUP_BOOTSTRAP_SECRET_CONFIRM"), false);
    assert.equal(missing.includes("BOOTSTRAP_TEMP_PASSWORD"), false);
    assert.doesNotMatch(
      formatMissingEnvError(missingProductionRuntimeEnvVars({ NODE_ENV: "production" })),
      /SETUP_BOOTSTRAP/,
    );
  });

  it("never includes secret values in validation errors", () => {
    const message = formatMissingEnvError([
      ENV_VAR.supabaseSecretKey,
      ENV_VAR.supabaseUrl,
    ]);
    assert.match(message, /SUPABASE_SECRET_KEY/);
    assert.match(message, /never logged/i);
    assert.doesNotMatch(message, new RegExp(SECRET_VALUE));
    assert.equal(message.includes(SECRET_VALUE), false);
  });
});

describe("FQA-006 wiring contracts", () => {
  it("registers instrumentation fail-fast and keeps admin client on shared helpers", () => {
    const root = process.cwd();
    const instrumentation = readFileSync(
      path.join(root, "src/instrumentation.ts"),
      "utf8",
    );
    const admin = readFileSync(
      path.join(root, "src/lib/supabase/admin.ts"),
      "utf8",
    );
    const envModule = readFileSync(path.join(root, "src/config/env.ts"), "utf8");

    assert.match(instrumentation, /assertProductionRuntimeEnv/);
    assert.match(instrumentation, /NEXT_RUNTIME === "edge"/);
    assert.match(admin, /missingAdminSupabaseEnvVars/);
    assert.match(admin, /formatMissingEnvError/);
    assert.match(admin, /server-only/);
    assert.doesNotMatch(envModule, /SETUP_BOOTSTRAP_SECRET/);
    assert.match(envModule, /assertProductionRuntimeEnv/);
    assert.match(envModule, /isNextProductionBuild/);
  });
});

