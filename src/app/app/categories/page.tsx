import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { CreateCategoryButton } from "@/components/master-data/CategoryForms";
import { SimpleFilters } from "@/components/master-data/SimpleFilters";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { requireAdmin } from "@/lib/auth/session";
import { listCategories } from "@/lib/master-data/categories/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  let list;
  try {
    list = await listCategories(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load product categories."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Product Categories"
        description="Manage catalogue categories used when creating and editing products. Inactive categories remain visible on existing products but cannot be newly assigned."
        actions={<CreateCategoryButton />}
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SimpleFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          searchPlaceholder="Category name"
        />
      </Suspense>

      {list.categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No product categories match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.categories.map((category) => (
              <RecordCard
                key={category.id}
                title={category.name}
                badge={<ActiveBadge active={category.is_active} />}
                action={
                  <ListActionLink href={`/app/categories/${category.id}`}>
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-line/70 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={category.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/categories/${category.id}`}
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
            Showing {list.categories.length} of {list.total}
            {totalPages > 1 ? ` · Page ${list.page} of ${totalPages}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
