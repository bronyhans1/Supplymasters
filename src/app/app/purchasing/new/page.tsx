import Link from "next/link";
import { PurchaseForm } from "@/components/purchasing/PurchaseForm";
import { requireAdmin } from "@/lib/auth/session";
import { countActiveSuppliers } from "@/lib/partners/options";
import { countActiveProducts } from "@/lib/products/options";
import { AppError } from "@/lib/utils/errors";

export default async function NewPurchasePage() {
  await requireAdmin();
  let activeSupplierCount;
  let activeProductCount;
  try {
    [activeSupplierCount, activeProductCount] = await Promise.all([
      countActiveSuppliers(),
      countActiveProducts(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load purchasing form options."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/purchasing"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to purchasing
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          Receive purchase
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Select a stock supplier and products, then confirm to receive stock. Inventory
          updates immediately when the purchase is received.
        </p>
      </div>

      <PurchaseForm
        hasActiveSuppliers={activeSupplierCount > 0}
        hasActiveProducts={activeProductCount > 0}
      />
    </section>
  );
}
