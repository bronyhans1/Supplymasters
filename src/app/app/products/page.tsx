import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { CreateProductButton } from "@/components/master-data/ProductForms";
import { SimpleFilters } from "@/components/master-data/SimpleFilters";
import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { buildPageHref } from "@/lib/navigation/pagination";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { canManageProducts } from "@/lib/master-data/authorization";
import { listCategoriesForProductSelect } from "@/lib/master-data/categories/queries";
import type { CategorySelectOption } from "@/lib/master-data/categories/types";
import { listProducts } from "@/lib/master-data/products/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { profile } = await requireStaffOrAdmin();
  const canManage = canManageProducts(profile);
  let list;
  let categories: CategorySelectOption[] = [];
  try {
    list = await listProducts(params);
    if (canManage) {
      categories = await listCategoriesForProductSelect();
    }
  } catch (error) {
    return (
      <ErrorBlock
        message={error instanceof AppError ? error.message : "Unable to load products."}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Products"
        description={
          canManage
            ? "Catalogue of wholesale products used in supplies and inventory."
            : "Browse active catalogue products for supplies and inventory. Catalogue edits are administrator-only."
        }
        actions={
          canManage ? <CreateProductButton categories={categories} /> : null
        }
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SimpleFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          searchPlaceholder="Code or name"
          extraFields={
            <>
              <FilterInput name="brand" label="Brand" defaultValue={list.query.brand} />
              <FilterInput
                name="category"
                label="Category"
                defaultValue={list.query.category}
              />
            </>
          }
        />
      </Suspense>

      {list.products.length === 0 ? (
        <Empty message="No products match these filters." />
      ) : (
        <>
          <MobileRecordList>
            {list.products.map((product) => (
              <RecordCard
                key={product.id}
                title={product.name}
                subtitle={product.product_code}
                badge={<ActiveBadge active={product.is_active} />}
                fields={[
                  { label: "Brand", value: product.brand },
                  { label: "Category", value: product.category },
                  { label: "Packaging", value: product.packaging_size },
                  { label: "UoM", value: product.unit_of_measure },
                ]}
                action={
                  <ListActionLink href={`/app/products/${product.id}`}>
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
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Brand</Th>
                  <Th>Category</Th>
                  <Th>Packaging</Th>
                  <Th>UoM</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {list.products.map((product) => (
                  <tr key={product.id} className="border-b border-line/70 last:border-0">
                    <Td className="font-medium">{product.product_code}</Td>
                    <Td>{product.name}</Td>
                    <Td className="text-muted">{product.brand}</Td>
                    <Td className="text-muted">{product.category}</Td>
                    <Td className="text-muted">{product.packaging_size}</Td>
                    <Td className="text-muted">{product.unit_of_measure}</Td>
                    <Td>
                      <ActiveBadge active={product.is_active} />
                    </Td>
                    <Td>
                      <ListActionLink
                        href={`/app/products/${product.id}`}
                        variant="table"
                      >
                        Manage
                      </ListActionLink>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>
          <Pager
            base="/app/products"
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            shown={list.products.length}
            query={{
              q: list.query.q,
              brand: list.query.brand,
              category: list.query.category,
              status: list.query.status,
            }}
          />
        </>
      )}
    </section>
  );
}

function FilterInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
      {message}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

function Pager({
  base,
  page,
  totalPages,
  total,
  shown,
  query,
}: {
  base: string;
  page: number;
  totalPages: number;
  total: number;
  shown: number;
  query: Record<string, string>;
}) {
  return (
    <ListPager
      page={page}
      totalPages={totalPages}
      total={total}
      shown={shown}
      prevHref={page > 1 ? buildPageHref(base, page - 1, query) : null}
      nextHref={page < totalPages ? buildPageHref(base, page + 1, query) : null}
    />
  );
}
