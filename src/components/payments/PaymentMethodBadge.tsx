import {
  paymentMethodBadgeClass,
  paymentMethodLabel,
} from "@/lib/payments/presentation";
import { cn } from "@/lib/utils/cn";
import type { PaymentMethod } from "@/types/database";

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
        paymentMethodBadgeClass(method),
      )}
    >
      {paymentMethodLabel(method)}
    </span>
  );
}
