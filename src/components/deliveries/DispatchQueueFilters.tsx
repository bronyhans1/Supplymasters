"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Awaiting dispatch" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "OPEN", label: "Pending + dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "ALL", label: "All statuses" },
] as const;

export function DispatchQueueFilters({
  initialQ,
  initialStatus,
  initialFromDate,
  initialToDate,
}: {
  initialQ: string;
  initialStatus: string;
  initialFromDate: string;
  initialToDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-surface/90 p-4 sm:grid-cols-2 lg:grid-cols-4 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());
        for (const key of ["q", "status", "fromDate", "toDate"]) {
          const text = String(form.get(key) ?? "").trim();
          if (!text) params.delete(key);
          else params.set(key, text);
        }
        params.delete("page");
        startTransition(() => {
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
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
          placeholder="Delivery ref or vendor"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Status
        </span>
        <select name="status" defaultValue={initialStatus || "PENDING"} className={fieldClass}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
      <div className="sm:col-span-2 lg:col-span-4">
        <FilterActions pending={pending} />
      </div>
    </form>
  );
}
