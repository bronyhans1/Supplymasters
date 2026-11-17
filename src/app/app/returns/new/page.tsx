import Link from "next/link";
import { RecordReturnForm } from "@/components/returns/RecordReturnForm";
import {
  getReturnEligibility,
  resolveReturnableDeliveryOption,
} from "@/lib/returns/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const deliveryId =
    typeof params.deliveryId === "string" ? params.deliveryId : "";

  let selectedDelivery = null;
  let eligibility = null;

  if (deliveryId) {
    try {
      [selectedDelivery, eligibility] = await Promise.all([
        resolveReturnableDeliveryOption(deliveryId),
        getReturnEligibility(deliveryId),
      ]);
    } catch (error) {
      if (!(error instanceof AppError && error.statusCode === 404)) {
        return (
          <div role="alert" className="text-sm text-accent">
            {error instanceof AppError
              ? error.message
              : "Unable to load return eligibility."}
          </div>
        );
      }
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/returns"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to returns
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          Record stock return
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Explicitly restore inventory for products returned from a FAILED or
          CANCELLED delivery. This does not refund payments.
        </p>
      </div>

      <RecordReturnForm
        key={eligibility?.delivery.id ?? selectedDelivery?.id ?? "none"}
        eligibility={eligibility}
        selectedDelivery={selectedDelivery}
      />
    </section>
  );
}
