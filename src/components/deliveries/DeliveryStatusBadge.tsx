import { deliveryStatusBadgeClass, deliveryStatusLabel } from "@/lib/deliveries/presentation";
import type { DeliveryStatus } from "@/types/database";
import { cn } from "@/lib/utils/cn";

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        deliveryStatusBadgeClass(status),
      )}
    >
      {deliveryStatusLabel(status)}
    </span>
  );
}
