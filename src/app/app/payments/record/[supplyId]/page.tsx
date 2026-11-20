import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordPaymentForm } from "@/components/payments/RecordPaymentForm";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { getUnpaidSupplyForPayment } from "@/lib/payments/queries";
import { formatGhs } from "@/lib/supplies/money";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ supplyId: string }>;

export default async function RecordPaymentPage({ params }: { params: Params }) {
  await requireStaffOrAdmin();
  const { supplyId } = await params;

  let supply;
  try {
    supply = await getUnpaidSupplyForPayment(supplyId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    if (error instanceof AppError && error.statusCode === 409) {
      return (
        <section className="mx-auto w-full max-w-3xl space-y-4">
          <Link
            href="/app/payments"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            ← Back to payments
          </Link>
          <p role="alert" className="text-sm text-accent">
            {error.message}
          </p>
        </section>
      );
    }
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that supply."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/app/payments"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to payments
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          Record payment
        </h1>
        <p className="mt-1 text-sm text-muted">
          {supply.vendor?.business_name ?? "Vendor"} · {supply.supply_ref} ·{" "}
          {formatGhs(supply.grand_total)} due
        </p>
      </div>

      <RecordPaymentForm supply={supply} />
    </section>
  );
}
