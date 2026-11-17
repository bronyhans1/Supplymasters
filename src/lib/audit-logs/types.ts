import type { ListAuditLogsQuery } from "./schemas";
import type { AuditDetailField } from "./presentation";

/**
 * Client-facing audit row. Contains presentation fields only —
 * no actor/entity UUIDs, raw metadata, or technical identifiers.
 */
export type AuditLogListItem = {
  /** Opaque row key for React reconciliation only — never rendered. */
  rowKey: string;
  actionLabel: string;
  actorLabel: string;
  createdAt: string;
  createdAtLabel: string;
  targetLabel: string;
  description: string;
  detailFields: AuditDetailField[];
};

export type ListAuditLogsResult = {
  rows: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  query: ListAuditLogsQuery;
};
