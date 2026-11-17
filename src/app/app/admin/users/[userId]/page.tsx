import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ActiveBadge,
  PasswordFlagBadge,
  RoleBadge,
} from "@/components/admin/UserStatusBadge";
import { UserManagePanel } from "@/components/admin/UserManagePanel";
import { CopyableReference } from "@/components/ui/CopyableReference";
import { getUserForAdmin } from "@/lib/admin/users/queries";
import { requireAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ userId: string }>;

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Params;
}) {
  const { userId } = await params;
  const { profile: actor } = await requireAdmin();

  let user;
  try {
    user = await getUserForAdmin(userId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }
    const message =
      error instanceof AppError ? error.message : "Unable to load that user.";
    return (
      <div
        role="alert"
        className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
      >
        {message}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/app/admin/users"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to users
        </Link>
        <h2 className="mt-3 font-display text-2xl tracking-tight text-ink">
          {user.full_name}
        </h2>
        <p className="mt-2 text-sm text-muted">{user.email}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item label="Phone number" value={user.phone ?? "—"} />
        <Item
          label="Role"
          value={<RoleBadge role={user.role} />}
        />
        <Item
          label="Account status"
          value={<ActiveBadge active={user.is_active} />}
        />
        <Item
          label="Password change required"
          value={<PasswordFlagBadge required={user.must_change_password} />}
        />
        <Item label="Created" value={formatDate(user.created_at)} />
        <Item label="Updated" value={formatDate(user.updated_at)} />
        <CopyableReference value={user.id} label="Internal reference" />
      </dl>

      <UserManagePanel user={user} isSelf={actor.id === user.id} />
    </section>
  );
}

function Item({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
