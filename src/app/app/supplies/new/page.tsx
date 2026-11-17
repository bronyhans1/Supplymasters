import Link from "next/link";
import { SupplyForm } from "@/components/supplies/SupplyForm";
import { countActiveVendors } from "@/lib/partners/options";
import { countActiveProducts } from "@/lib/products/options";
import { AppError } from "@/lib/utils/errors";

export default async function NewSupplyPage() {
  let activeVendorCount;
  let activeProductCount;
  try {
    [activeVendorCount, activeProductCount] = await Promise.all([
      countActiveVendors(),
      countActiveProducts(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load supply form data."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/supplies"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Back to supplies
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          New supply
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Confirm a wholesale supply with full payment. Stock is deducted and the
          supply is marked paid in one database transaction.
        </p>
      </div>

      <SupplyForm
        hasActiveVendors={activeVendorCount > 0}
        hasActiveProducts={activeProductCount > 0}
      />
    </section>
  );
}
