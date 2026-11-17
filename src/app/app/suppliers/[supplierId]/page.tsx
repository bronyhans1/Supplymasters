import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { SupplierStatusControl } from "@/components/master-data/EntityStatusControls";
import { EditSupplierForm } from "@/components/master-data/SupplierForms";
import { requireAdmin } from "@/lib/auth/session";
import { getSupplier } from "@/lib/master-data/suppliers/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ supplierId: string }>;

export default async function SupplierDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { supplierId } = await params;
  let supplier;
  try {
    supplier = await getSupplier(supplierId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load stock supplier."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/app/suppliers" className="text-sm font-medium text-accent hover:underline">
          ← Back to stock suppliers
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {supplier.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{supplier.supplier_code}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        <Item label="Contact person" value={supplier.contact_person ?? "—"} />
        <Item label="Phone number" value={supplier.phone ?? "—"} />
        <Item label="Location" value={supplier.location ?? "—"} />
        <Item label="Status" value={<ActiveBadge active={supplier.is_active} />} />
        <Item label="Notes" value={supplier.notes ?? "—"} />
      </dl>

      <EditSupplierForm supplier={supplier} />
      <div className="rounded-xl border border-line bg-white/70 p-5">
        <SupplierStatusControl id={supplier.id} isActive={supplier.is_active} />
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
