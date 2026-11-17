import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import type { DeliveryHistoryEntry } from "@/lib/deliveries/queries";
import {
  deliveryStatusLabel,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";

export function DeliveryTimeline({ history }: { history: DeliveryHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-sm text-muted">
        No status history recorded yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3 rounded-xl border border-line bg-surface/90 p-5">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="border-b border-line/70 pb-3 last:border-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <DeliveryStatusBadge status={entry.to_status} />
            <span className="text-xs text-muted">
              {formatDeliveryDateTime(entry.created_at)}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink">
            {entry.from_status
              ? `${deliveryStatusLabel(entry.from_status)} → ${deliveryStatusLabel(entry.to_status)}`
              : `Set to ${deliveryStatusLabel(entry.to_status)}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            By {entry.actor_name ?? "Unknown staff member"}
          </p>
          {entry.notes ? (
            <p className="mt-2 text-sm leading-6 text-muted">{entry.notes}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
