"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changeManagedUserRole,
  completeManagedUserProvisioning,
  requireManagedUserPasswordChange,
  setManagedUserActive,
} from "@/lib/admin/users/actions";
import {
  PROVISIONABLE_ROLES,
  isProvisionableRole,
  type AppRole,
  type ProvisionableRole,
} from "@/lib/auth/roles";
import type { Profile } from "@/types/profile";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formControlClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/ToastProvider";

type PendingAction =
  | { kind: "role"; role: ProvisionableRole }
  | { kind: "deactivate" }
  | { kind: "activate" }
  | { kind: "provision"; role: ProvisionableRole }
  | { kind: "password" }
  | null;

export function UserManagePanel({
  user,
  isSelf,
}: {
  user: Profile;
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<AppRole | ProvisionableRole>(
    user.role === "DRIVER" ? "DRIVER" : user.role,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingAction>(null);

  function run(
    action: () => Promise<{
      ok: boolean;
      error?: { message: string };
      message?: string;
    }>,
  ) {
    if (pending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        const failure = result.error?.message ?? "Request failed.";
        setError(failure);
        setConfirmAction(null);
        toast.error(failure);
        return;
      }
      const success = result.message ?? "Updated.";
      setMessage(success);
      setConfirmAction(null);
      toast.success(success);
      router.refresh();
    });
  }

  const confirmCopy = (() => {
    if (!confirmAction) return null;
    if (confirmAction.kind === "role") {
      return {
        title: "Update user role?",
        description: `Change ${user.full_name} from ${user.role} to ${confirmAction.role}?`,
        confirmLabel: "Update role",
        pendingLabel: "Updating role…",
        variant: "warning" as const,
      };
    }
    if (confirmAction.kind === "deactivate") {
      return {
        title: "Deactivate account?",
        description: `${user.full_name} will be unable to sign in until reactivated.`,
        confirmLabel: "Deactivate account",
        pendingLabel: "Deactivating account…",
        variant: "destructive" as const,
      };
    }
    if (confirmAction.kind === "activate") {
      return {
        title: "Activate account?",
        description: `Allow ${user.full_name} to sign in again?`,
        confirmLabel: "Activate account",
        pendingLabel: "Activating account…",
        variant: "default" as const,
      };
    }
    if (confirmAction.kind === "provision") {
      return {
        title: "Finish provisioning?",
        description: `Activate ${user.full_name} as ${confirmAction.role}. Use this after a partial create where Auth succeeded but role assignment failed. Do not paste temporary passwords into the app.`,
        confirmLabel: "Finish provisioning",
        pendingLabel: "Finishing provisioning…",
        variant: "default" as const,
      };
    }
    return {
      title: "Require password change?",
      description: `${user.full_name} will need to change their password on next sign-in.`,
      confirmLabel: "Force password change",
      pendingLabel: "Updating password requirement…",
      variant: "warning" as const,
    };
  })();

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl text-ink">Administrative actions</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Manage this user&apos;s access, account status, and password requirements.
          The system will not allow removing the last active administrator.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent"
        >
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          role="status"
          className="rounded-lg border border-good/25 bg-good/10 px-3 py-2 text-sm text-good"
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Role</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as AppRole | ProvisionableRole)
            }
            disabled={pending}
            className={formControlClass}
          >
            {user.role === "DRIVER" ? (
              <option value="DRIVER">DRIVER (unsupported — convert)</option>
            ) : null}
            {PROVISIONABLE_ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <LoadingButton
          type="button"
          pending={pending && confirmAction?.kind === "role"}
          disabled={
            pending ||
            role === user.role ||
            !isProvisionableRole(role)
          }
          idleLabel="Update role"
          pendingLabel="Updating role…"
          className="w-full sm:w-auto"
          onClick={() => {
            if (pending || role === user.role || !isProvisionableRole(role)) return;
            setConfirmAction({ kind: "role", role });
          }}
        />
      </div>

      {!user.is_active && user.must_change_password && user.role === "STAFF" ? (
        <div className="rounded-lg border border-line bg-paper/70 px-3 py-3 text-sm text-muted">
          <p>
            This account looks like a partial or unfinished provision (inactive STAFF,
            password change required). Finish provisioning before delivering credentials
            out-of-band.
          </p>
          <LoadingButton
            type="button"
            className="mt-3 w-full sm:w-auto"
            pending={pending && confirmAction?.kind === "provision"}
            disabled={pending || !isProvisionableRole(role)}
            idleLabel="Finish provisioning"
            pendingLabel="Finishing provisioning…"
            onClick={() => {
              if (pending || !isProvisionableRole(role)) return;
              setConfirmAction({ kind: "provision", role });
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {user.is_active ? (
          <LoadingButton
            type="button"
            className="w-full sm:w-auto"
            variant="danger"
            pending={pending && confirmAction?.kind === "deactivate"}
            disabled={pending || (isSelf && user.role === "ADMIN")}
            idleLabel="Deactivate account"
            pendingLabel="Deactivating account…"
            onClick={() => {
              if (pending || (isSelf && user.role === "ADMIN")) return;
              setConfirmAction({ kind: "deactivate" });
            }}
          />
        ) : (
          <LoadingButton
            type="button"
            className="w-full sm:w-auto"
            pending={pending && confirmAction?.kind === "activate"}
            disabled={pending}
            idleLabel="Activate account"
            pendingLabel="Activating account…"
            onClick={() => {
              if (pending) return;
              setConfirmAction({ kind: "activate" });
            }}
          />
        )}

        <LoadingButton
          type="button"
          className="w-full sm:w-auto"
          variant="secondary"
          pending={pending && confirmAction?.kind === "password"}
          disabled={pending || user.must_change_password}
          idleLabel="Force password change"
          pendingLabel="Updating password requirement…"
          onClick={() => {
            if (pending || user.must_change_password) return;
            setConfirmAction({ kind: "password" });
          }}
        />
      </div>

      {confirmCopy && confirmAction ? (
        <ConfirmDialog
          open
          pending={pending}
          variant={confirmCopy.variant}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          pendingLabel={confirmCopy.pendingLabel}
          onCancel={() => {
            if (!pending) setConfirmAction(null);
          }}
          onConfirm={() => {
            if (!confirmAction) return;
            if (confirmAction.kind === "role") {
              run(async () =>
                changeManagedUserRole({ userId: user.id, role: confirmAction.role }),
              );
              return;
            }
            if (confirmAction.kind === "deactivate") {
              run(async () =>
                setManagedUserActive({ userId: user.id, isActive: false }),
              );
              return;
            }
            if (confirmAction.kind === "activate") {
              run(async () =>
                setManagedUserActive({ userId: user.id, isActive: true }),
              );
              return;
            }
            if (confirmAction.kind === "provision") {
              run(async () =>
                completeManagedUserProvisioning({
                  userId: user.id,
                  role: confirmAction.role,
                }),
              );
              return;
            }
            run(async () => requireManagedUserPasswordChange({ userId: user.id }));
          }}
        />
      ) : null}
    </div>
  );
}