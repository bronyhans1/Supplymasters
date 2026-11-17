import Link from "next/link";
import {
  Banknote,
  Boxes,
  Package,
  PackageCheck,
  ShoppingBag,
  Store,
  Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { requireRole } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/reports/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

export default async function StaffHomePage() {
  const { profile } = await requireRole(["STAFF", "ADMIN"]);

  let summaryError: string | null = null;
  let summary = null;
  try {
    summary = await getDashboardSummary();
  } catch (error) {
    summaryError =
      error instanceof AppError
        ? error.message
        : "Unable to load dashboard metrics.";
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          <>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
              {profile.role}
            </span>
            Run daily distribution work: products, vendors, inventory, supplies,
            payments, deliveries, and returns. Suppliers, drivers, purchasing, and
            management reports are administrator responsibilities.
          </>
        }
      />

      {summaryError ? (
        <div role="alert" className="text-sm text-accent">
          {summaryError}
        </div>
      ) : summary ? (
        <DashboardMetrics summary={summary} role={profile.role} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashLink href="/app/inventory" title="Inventory" icon={Package} />
        <DashLink href="/app/supplies" title="Supplies" icon={ShoppingBag} />
        <DashLink href="/app/payments" title="Payments" icon={Banknote} />
        <DashLink href="/app/deliveries" title="Deliveries" icon={PackageCheck} />
        <DashLink href="/app/returns" title="Returns" icon={Undo2} />
        <DashLink href="/app/products" title="Products" icon={Boxes} />
        <DashLink href="/app/vendors" title="Vendors" icon={Store} />
      </div>
    </section>
  );
}

function DashLink({
  href,
  title,
  icon: Icon,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-line bg-white/70 p-4 transition hover:bg-white sm:p-5",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-ink text-paper">
        <Icon size={18} />
      </span>
      <span className="min-w-0 break-words text-sm font-semibold text-ink">
        {title}
      </span>
    </Link>
  );
}
