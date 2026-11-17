import type { DeliveryAssignmentHistoryEntry } from "@/lib/deliveries/queries";

export function AssignmentHistory({
  events,
}: {
  events: DeliveryAssignmentHistoryEntry[];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-sm text-muted">
        No assignment changes recorded yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3 rounded-xl border border-line bg-surface/90 p-5">
      {events.map((event) => (
        <li
          key={event.id}
          className="border-b border-line/70 pb-3 last:border-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">{event.eventLabel}</p>
            <span className="text-xs text-muted">{event.createdAtLabel}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{event.description}</p>
          <p className="mt-1 text-xs text-muted">By {event.actorLabel}</p>
        </li>
      ))}
    </ol>
  );
}
