import Link from "next/link";
import type { AppRole } from "@/lib/auth/roles";
import type { DashboardSummary } from "@/lib/reports/queries";
import { buildDashboardMetricCards } from "@/lib/reports/dashboard-presentation";
import { focusRingClass } from "@/components/ui/ResponsiveRecords";
import { cn } from "@/lib/utils/cn";

export function DashboardMetrics({
  summary,
  role,
}: {
  summary: DashboardSummary;
  role: AppRole;
}) {
  const cards = buildDashboardMetricCards(summary, role);

  return (
    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const body = (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {card.label}
            </p>
            <p className="mt-2 break-words text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {card.primary}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-muted">
              {card.secondary}
            </p>
          </>
        );

        const shellClass = cn(
          "min-w-0 rounded-xl border border-line bg-surface/90 px-4 py-4",
        );

        if (!card.href) {
          return (
            <div key={card.label} className={shellClass}>
              {body}
            </div>
          );
        }

        return (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              shellClass,
              focusRingClass,
              "transition hover:border-ink/20 hover:bg-white",
            )}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
