"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type {
  ActiveDriverOption,
  EligibleStaffOption,
} from "@/lib/deliveries/queries";
import { filterStatusOptions } from "@/lib/deliveries/presentation";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);

export function DeliveryFilters({
  initialQ,
  initialStatus,
  initialFromDate,
  initialToDate,
  initialStaffId,
  initialDriverId,
  staffOptions,
  driverOptions,
}: {
  initialQ: string;
  initialStatus: string;
  initialFromDate: string;
  initialToDate: string;
  initialStaffId: string;
  initialDriverId: string;
  staffOptions: EligibleStaffOption[];
  driverOptions: ActiveDriverOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-surface/90 p-4 sm:grid-cols-2 lg:grid-cols-3 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());
        for (const key of ["q", "status", "fromDate", "toDate", "staffId", "driverId"]) {
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
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search
        </span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder="Delivery code, supply, vendor, phone, or driver"
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Status
        </span>
        <select name="status" defaultValue={initialStatus} className={fieldClass}>
          {filterStatusOptions().map((option) => (
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

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Responsible staff
        </span>
        <select name="staffId" defaultValue={initialStaffId} className={fieldClass}>
          <option value="">All staff</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Driver
        </span>
        <select name="driverId" defaultValue={initialDriverId} className={fieldClass}>
          <option value="">All drivers</option>
          <option value="unassigned">Unassigned</option>
          {driverOptions.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.driver_code} · {driver.full_name}
              {driver.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
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
