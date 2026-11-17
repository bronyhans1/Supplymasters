import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { ProductStatusControl } from "@/components/master-data/EntityStatusControls";
import { EditProductForm } from "@/components/master-data/ProductForms";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { canManageProducts } from "@/lib/master-data/authorization";
import { listCategoriesForProductSelect } from "@/lib/master-data/categories/queries";
import type { CategorySelectOption } from "@/lib/master-data/categories/types";
import { getProduct } from "@/lib/master-data/products/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ productId: string }>;

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { productId } = await params;
  const { profile } = await requireStaffOrAdmin();
  const canManage = canManageProducts(profile);
  let product;
  let categories: CategorySelectOption[] = [];
  try {
    product = await getProduct(productId);
    if (canManage) {
      categories = await listCategoriesForProductSelect(product.category_id);
    }
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load product."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/app/products" className="text-sm font-medium text-accent hover:underline">
          ← Back to products
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {product.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{product.product_code}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        <Item label="Brand" value={product.brand} />
        <Item label="Category" value={product.category} />
        <Item label="Packaging" value={product.packaging_size} />
        <Item label="Unit of measure" value={product.unit_of_measure} />
        <Item label="Status" value={<ActiveBadge active={product.is_active} />} />
      </dl>

      {canManage ? (
        <>
          <EditProductForm product={product} categories={categories} />
          <div className="rounded-xl border border-line bg-white/70 p-5">
            <ProductStatusControl id={product.id} isActive={product.is_active} />
          </div>
        </>
      ) : null}
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
