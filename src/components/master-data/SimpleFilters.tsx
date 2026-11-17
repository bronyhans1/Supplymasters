"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

export function SimpleFilters({
  initialQ,
  initialStatus,
  searchPlaceholder,
  extraFields,
}: {
  initialQ: string;
  initialStatus: string;
  searchPlaceholder: string;
  extraFields?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());
        const entries = Object.fromEntries(form.entries());
        for (const [key, value] of Object.entries(entries)) {
          const text = String(value).trim();
          if (!text || (key === "status" && text === "ALL")) params.delete(key);
          else params.set(key, text);
        }
        params.delete("page");
        startTransition(() => {
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
      }}
    >
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Search</span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder={searchPlaceholder}
          className={cn(
            "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
            "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
          )}
        />
      </label>
      {extraFields}
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
        <select
          name="status"
          defaultValue={initialStatus}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>
      <FilterActions
        pending={pending}
        className="sm:col-span-2 lg:col-span-4"
        onClear={() => {
          if (pending) return;
          startTransition(() => router.push(pathname));
        }}
      />
    </form>
  );
}
