import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { VendorStatusControl } from "@/components/master-data/EntityStatusControls";
import { EditVendorForm } from "@/components/master-data/VendorForms";
import { getVendor } from "@/lib/master-data/vendors/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ vendorId: string }>;

export default async function VendorDetailPage({ params }: { params: Params }) {
  const { vendorId } = await params;
  let vendor;
  try {
    vendor = await getVendor(vendorId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load vendor."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/app/vendors" className="text-sm font-medium text-accent hover:underline">
          ← Back to vendors
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {vendor.business_name}
        </h1>
        <p className="mt-1 text-sm text-muted">{vendor.vendor_code}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        <Item label="Contact person" value={vendor.contact_person} />
        <Item label="Phone number" value={vendor.phone} />
        <Item label="Alt phone number" value={vendor.alt_phone ?? "—"} />
        <Item label="Location" value={vendor.location} />
        <Item label="Digital address" value={vendor.digital_address ?? "—"} />
        <Item label="Status" value={<ActiveBadge active={vendor.is_active} />} />
        <Item label="Notes" value={vendor.notes ?? "—"} />
      </dl>

      <EditVendorForm vendor={vendor} />
      <div className="rounded-xl border border-line bg-white/70 p-5">
        <VendorStatusControl id={vendor.id} isActive={vendor.is_active} />
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
