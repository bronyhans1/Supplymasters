import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { SimpleFilters } from "@/components/master-data/SimpleFilters";
import { CreateVendorButton } from "@/components/master-data/VendorForms";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { listVendors } from "@/lib/master-data/vendors/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  let list;
  try {
    list = await listVendors(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load vendors."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Vendors"
        description="Wholesale buyers/businesses that purchase supplies from SUPPLY MASTERS."
        actions={<CreateVendorButton />}
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SimpleFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          searchPlaceholder="Code, business, contact person, or phone number"
        />
      </Suspense>

      {list.vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No vendors match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.vendors.map((vendor) => (
              <RecordCard
                key={vendor.id}
                title={vendor.business_name}
                subtitle={vendor.vendor_code}
                badge={<ActiveBadge active={vendor.is_active} />}
                fields={[
                  { label: "Contact", value: vendor.contact_person },
                  {
                    label: "Phone",
                    value: vendor.alt_phone
                      ? `${vendor.phone} / ${vendor.alt_phone}`
                      : vendor.phone,
                  },
                  { label: "Location", value: vendor.location },
                  {
                    label: "Digital address",
                    value: vendor.digital_address ?? "—",
                  },
                ]}
                action={
                  <ListActionLink href={`/app/vendors/${vendor.id}`}>
                    Manage
                  </ListActionLink>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTableShell>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Contact person</th>
                  <th className="px-4 py-3 font-medium">Phone number</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Digital address</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{vendor.vendor_code}</td>
                    <td className="px-4 py-3">{vendor.business_name}</td>
                    <td className="px-4 py-3 text-muted">{vendor.contact_person}</td>
                    <td className="px-4 py-3 text-muted">
                      {vendor.phone}
                      {vendor.alt_phone ? ` / ${vendor.alt_phone}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted">{vendor.location}</td>
                    <td className="px-4 py-3 text-muted">
                      {vendor.digital_address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={vendor.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/vendors/${vendor.id}`}
                        variant="table"
                      >
                        Manage
                      </ListActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>

          <p className="text-sm text-muted">
            Showing {list.vendors.length} of {list.total}
            {totalPages > 1 ? ` · Page ${list.page} of ${totalPages}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
