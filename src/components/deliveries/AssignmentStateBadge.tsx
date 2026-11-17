import { deliveryAssignmentStateLabel } from "@/lib/deliveries/presentation";
import type { DeliveryStatus } from "@/types/database";
import { cn } from "@/lib/utils/cn";

export function AssignmentStateBadge({
  status,
  driverId,
}: {
  status: DeliveryStatus;
  driverId: string | null;
}) {
  const label = deliveryAssignmentStateLabel({ status, driverId });
  const tone =
    label === "Driver assigned"
      ? "bg-good/10 text-good"
      : label === "Needs driver"
        ? "bg-accent/10 text-accent"
        : "bg-line/60 text-muted";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs font-medium",
        tone,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
