import type { ReactNode } from "react";
import {
  DesktopTableShell,
  MobileRecordList,
  RecordCard,
  type RecordCardField,
} from "@/components/ui/ResponsiveRecords";
import { cn } from "@/lib/utils/cn";

export function ReportSummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface/90 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 break-words text-xs leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function ReportSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-6">
      <div className="min-w-0">
        <h2 className="font-display text-xl tracking-tight text-ink">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export type ReportTableRow = {
  key: string;
  /** Primary label on mobile cards. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Secondary labeled fields on mobile (skip the title column). */
  fields: RecordCardField[];
  /** Desktop cell values aligned to `headers` order. */
  cells: ReactNode[];
};

/**
 * Dual presentation for report breakdowns and history:
 * compact cards below `md`, full table from `md` up.
 */
export function ReportTable({
  headers,
  rows,
  empty = "No rows for this filter set.",
  className,
}: {
  headers: string[];
  rows: ReportTableRow[];
  empty?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        {empty}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <MobileRecordList>
        {rows.map((row) => (
          <RecordCard
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            fields={row.fields}
          />
        ))}
      </MobileRecordList>

      <DesktopTableShell className="bg-surface/90">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/70 last:border-0">
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.key}-${headers[index] ?? index}`}
                    className="px-4 py-3 align-top"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DesktopTableShell>
    </div>
  );
}

/** Helper for numeric/money secondary cells that should read muted on desktop. */
export function mutedCell(value: ReactNode) {
  return <span className="text-muted">{value}</span>;
}

export function strongCell(value: ReactNode) {
  return <span className="font-medium text-ink">{value}</span>;
}
