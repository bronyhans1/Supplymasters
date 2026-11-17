import { cn } from "@/lib/utils/cn";
import type { AppRole } from "@/lib/auth/roles";
import { describeRole } from "@/lib/admin/users/authorization";

export function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        role === "ADMIN" && "border-ink/20 bg-ink/5 text-ink",
        role === "STAFF" && "border-line bg-white text-ink",
        role === "DRIVER" && "border-accent/20 bg-accent/5 text-accent",
      )}
    >
      {describeRole(role)}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-good/25 bg-good/10 text-good"
          : "border-line bg-paper text-muted",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function PasswordFlagBadge({ required }: { required: boolean }) {
  if (!required) {
    return <span className="text-xs text-muted">No</span>;
  }
  return (
    <span className="inline-flex rounded-md border border-accent/25 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent">
      Required
    </span>
  );
}
