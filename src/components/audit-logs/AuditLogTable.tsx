"use client";

import { useEffect, useId, useState } from "react";
import {
  DesktopTableShell,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import type { AuditLogListItem } from "@/lib/audit-logs/types";
import { cn } from "@/lib/utils/cn";

export function AuditLogTable({ rows }: { rows: AuditLogListItem[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openRow = rows.find((row) => row.rowKey === openKey) ?? null;

  useEffect(() => {
    if (!openKey) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openKey]);

  return (
    <>
      <MobileRecordList>
        {rows.map((row) => (
          <RecordCard
            key={row.rowKey}
            title={row.actionLabel}
            subtitle={row.createdAtLabel}
            fields={[
              { label: "Actor", value: row.actorLabel },
              { label: "Target", value: row.targetLabel },
              {
                label: "Description",
                value: row.description ? (
                  <span className="whitespace-pre-line">{row.description}</span>
                ) : null,
              },
            ]}
            action={
              <button
                type="button"
                onClick={() => setOpenKey(row.rowKey)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-accent transition hover:bg-paper sm:flex-none"
              >
                Details
              </button>
            }
          />
        ))}
      </MobileRecordList>

      <DesktopTableShell className="bg-white/80 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper/90 text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <Th>Action</Th>
              <Th className="hidden md:table-cell">Actor</Th>
              <Th>Date</Th>
              <Th className="hidden lg:table-cell">Target</Th>
              <Th>Description</Th>
              <Th className="w-[1%] whitespace-nowrap text-right">
                <span className="sr-only">Details</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rowKey}
                className="border-b border-line/70 align-top last:border-b-0"
              >
                <Td>
                  <span className="inline-flex rounded-md border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink">
                    {row.actionLabel}
                  </span>
                  <p className="mt-1.5 text-xs text-muted md:hidden">{row.actorLabel}</p>
                </Td>
                <Td className="hidden md:table-cell text-ink">{row.actorLabel}</Td>
                <Td className="whitespace-nowrap text-muted">{row.createdAtLabel}</Td>
                <Td className="hidden lg:table-cell font-medium text-ink">
                  {row.targetLabel}
                </Td>
                <Td className="max-w-[22rem]">
                  <p className="whitespace-pre-line text-ink/90">{row.description || "—"}</p>
                  <p className="mt-1 text-xs text-muted lg:hidden">{row.targetLabel}</p>
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => setOpenKey(row.rowKey)}
                    className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink transition hover:border-ink/20"
                  >
                    Details
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </DesktopTableShell>

      {openRow ? (
        <AuditDetailDrawer row={openRow} onClose={() => setOpenKey(null)} />
      ) : null}
    </>
  );
}

function AuditDetailDrawer({
  row,
  onClose,
}: {
  row: AuditLogListItem;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close activity details"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-paper shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Activity details
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-ink">
              {row.actionLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <dl className="space-y-4">
            {row.detailFields.map((field) => (
              <div key={`${field.label}:${field.value}`}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-ink">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-3 font-semibold", className)}>{children}</th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3.5", className)}>{children}</td>;
}
