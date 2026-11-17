"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
} from "@/lib/audit-logs/schemas";
import {
  humanizeAuditAction,
  humanizeAuditEntityType,
} from "@/lib/audit-logs/presentation";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

export function AuditLogFilters({
  initialQ,
  initialAction,
  initialEntityType,
  initialActor,
  initialFromDate,
  initialToDate,
}: {
  initialQ: string;
  initialAction: string;
  initialEntityType: string;
  initialActor: string;
  initialFromDate: string;
  initialToDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Strip technical query keys so they never reappear in bookmarkable filter URLs.
    for (const key of ["entityId"] as const) {
      params.delete(key);
    }
    for (const [key, value] of Object.entries(next)) {
      const text = value.trim();
      if (!text) params.delete(key);
      else params.set(key, text);
    }
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-white/80 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        apply({
          q: String(form.get("q") ?? ""),
          action: String(form.get("action") ?? ""),
          entityType: String(form.get("entityType") ?? ""),
          actor: String(form.get("actor") ?? ""),
          fromDate: String(form.get("fromDate") ?? ""),
          toDate: String(form.get("toDate") ?? ""),
        });
      }}
    >
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search
        </span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder="Search activity, person, product, vendor or reference..."
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Activity type
        </span>
        <select name="action" defaultValue={initialAction} className={fieldClass}>
          <option value="">All activities</option>
          {AUDIT_ACTION_OPTIONS.map((action) => (
            <option key={action} value={action}>
              {humanizeAuditAction(action)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Target type
        </span>
        <select
          name="entityType"
          defaultValue={initialEntityType}
          className={fieldClass}
        >
          <option value="">All targets</option>
          {AUDIT_ENTITY_TYPE_OPTIONS.map((entityType) => (
            <option key={entityType} value={entityType}>
              {humanizeAuditEntityType(entityType)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Actor
        </span>
        <input
          name="actor"
          defaultValue={initialActor}
          placeholder="Person name"
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          From date
        </span>
        <input
          type="date"
          name="fromDate"
          defaultValue={initialFromDate}
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          To date
        </span>
        <input
          type="date"
          name="toDate"
          defaultValue={initialToDate}
          className={fieldClass}
        />
      </label>

      <FilterActions
        pending={pending}
        className="sm:col-span-2 lg:col-span-3"
        onClear={() => {
          if (pending) return;
          startTransition(() => router.push(pathname));
        }}
      />
    </form>
  );
}

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);
