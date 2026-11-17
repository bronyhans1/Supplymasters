import Link from "next/link";
import {
  Banknote,
  Boxes,
  IdCard,
  Package,
  PackageCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Undo2,
  Users,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { getDashboardSummary } from "@/lib/reports/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  {
    href: "/app/reports",
    title: "Reports",
    description: "Operational and financial summaries for the selected period.",
    icon: BarChart3,
  },
  {
    href: "/app/admin/users",
    title: "User management",
    description: "Create accounts, assign roles, and activate staff.",
    icon: Users,
  },
  {
    href: "/app/purchasing",
    title: "Purchasing",
    description: "Receive stock purchases and update inventory.",
    icon: ShoppingCart,
  },
  {
    href: "/app/inventory",
    title: "Inventory",
    description: "Review on-hand balances, movement history, and adjustments.",
    icon: Package,
  },
  {
    href: "/app/supplies",
    title: "Supplies",
    description: "Record paid wholesale supplies and deduct stock.",
    icon: ShoppingBag,
  },
  {
    href: "/app/payments",
    title: "Payments",
    description: "Review the full-payment ledger for wholesale supplies.",
    icon: Banknote,
  },
  {
    href: "/app/products",
    title: "Products",
    description: "Manage product catalogue for supplies and inventory.",
    icon: Boxes,
  },
  {
    href: "/app/categories",
    title: "Product Categories",
    description: "Manage dynamic product categories for the catalogue.",
    icon: Boxes,
  },
  {
    href: "/app/vendors",
    title: "Vendors",
    description: "Wholesale buyers who purchase supplies from SUPPLY MASTERS.",
    icon: Store,
  },
  {
    href: "/app/suppliers",
    title: "Stock Suppliers",
    description: "Upstream suppliers for inventory purchasing.",
    icon: Truck,
  },
  {
    href: "/app/drivers",
    title: "Drivers",
    description: "Manage operational delivery contacts (no app login).",
    icon: IdCard,
  },
  {
    href: "/app/deliveries",
    title: "Deliveries",
    description: "Track and update staff-managed wholesale deliveries.",
    icon: PackageCheck,
  },
  {
    href: "/app/returns",
    title: "Returns",
    description: "Record delivery stock returns and restore inventory.",
    icon: Undo2,
  },
] as const;

export default async function AdminHomePage() {
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
              Administrator
            </span>
            Administrative overview for SUPPLY MASTERS. Metrics reuse the Reports
            query layer. Master data, operations, and reports are available now.
          </>
        }
      />

      {summaryError ? (
        <div role="alert" className="text-sm text-accent">
          {summaryError}
        </div>
      ) : summary ? (
        <DashboardMetrics summary={summary} role="ADMIN" />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 items-start gap-4 rounded-xl border border-line bg-white/70 p-4 transition hover:border-ink/20 hover:bg-white sm:p-5",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-ink text-paper">
                <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
