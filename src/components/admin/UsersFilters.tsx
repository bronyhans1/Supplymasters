"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterActions } from "@/components/ui/FilterActions";
import { APP_ROLES } from "@/lib/auth/roles";
import { cn } from "@/lib/utils/cn";

export function UsersFilters({
  initialQ,
  initialRole,
  initialStatus,
}: {
  initialQ: string;
  initialRole: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "ALL" || (key === "q" && !value.trim())) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    if (pending) return;
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        apply({
          q: String(form.get("q") ?? ""),
          role: String(form.get("role") ?? "ALL"),
          status: String(form.get("status") ?? "ALL"),
        });
      }}
    >
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search
        </span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder="Name or email"
          className={cn(
            "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink",
            "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
          )}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Role
        </span>
        <select
          name="role"
          defaultValue={initialRole}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        >
          <option value="ALL">All roles</option>
          {APP_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Status
        </span>
        <select
          name="status"
          defaultValue={initialStatus}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>

      <FilterActions
        pending={pending}
        className="sm:col-span-2 lg:col-span-4"
        onClear={clearAll}
      />
    </form>
  );
}
