import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { CategoryStatusControl } from "@/components/master-data/EntityStatusControls";
import { EditCategoryForm } from "@/components/master-data/CategoryForms";
import { requireAdmin } from "@/lib/auth/session";
import { getCategory } from "@/lib/master-data/categories/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ categoryId: string }>;

export default async function CategoryDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { categoryId } = await params;
  let category;
  try {
    category = await getCategory(categoryId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load product category."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/app/categories"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Back to product categories
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {category.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Inactive categories remain visible on existing products but cannot be
          newly assigned.
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            Status
          </dt>
          <dd className="mt-1 text-sm text-ink">
            <ActiveBadge active={category.is_active} />
          </dd>
        </div>
      </dl>

      <EditCategoryForm category={category} />
      <div className="rounded-xl border border-line bg-white/70 p-5">
        <CategoryStatusControl id={category.id} isActive={category.is_active} />
      </div>
    </section>
  );
}
