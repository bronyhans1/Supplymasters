import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { SimpleFilters } from "@/components/master-data/SimpleFilters";
import { CreateSupplierButton } from "@/components/master-data/SupplierForms";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { requireAdmin } from "@/lib/auth/session";
import { listSuppliers } from "@/lib/master-data/suppliers/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  let list;
  try {
    list = await listSuppliers(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load stock suppliers."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Stock Suppliers"
        description="Upstream businesses from whom SUPPLY MASTERS purchases inventory."
        actions={<CreateSupplierButton />}
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SimpleFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          searchPlaceholder="Code, name, contact person, or phone number"
        />
      </Suspense>

      {list.suppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No stock suppliers match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.suppliers.map((supplier) => (
              <RecordCard
                key={supplier.id}
                title={supplier.name}
                subtitle={supplier.supplier_code}
                badge={<ActiveBadge active={supplier.is_active} />}
                fields={[
                  { label: "Contact", value: supplier.contact_person ?? "—" },
                  { label: "Phone", value: supplier.phone ?? "—" },
                  { label: "Location", value: supplier.location ?? "—" },
                ]}
                action={
                  <ListActionLink href={`/app/suppliers/${supplier.id}`}>
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact person</th>
                  <th className="px-4 py-3 font-medium">Phone number</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{supplier.supplier_code}</td>
                    <td className="px-4 py-3">{supplier.name}</td>
                    <td className="px-4 py-3 text-muted">{supplier.contact_person ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{supplier.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{supplier.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={supplier.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/suppliers/${supplier.id}`}
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
            Showing {list.suppliers.length} of {list.total}
            {totalPages > 1 ? ` · Page ${list.page} of ${totalPages}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
