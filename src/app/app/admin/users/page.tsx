import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { buildPageHref } from "@/lib/navigation/pagination";
import { Suspense } from "react";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import {
  ActiveBadge,
  PasswordFlagBadge,
  RoleBadge,
} from "@/components/admin/UserStatusBadge";
import { UsersFilters } from "@/components/admin/UsersFilters";
import { listUsersForAdmin } from "@/lib/admin/users/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  try {
    list = await listUsersForAdmin(params);
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "Unable to load users.";
    return (
      <section className="space-y-4">
        <Header />
        <div
          role="alert"
          className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
        >
          {message}
        </div>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const q = list.query.q;
  const role = list.query.role;
  const status = list.query.status;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header />
        <CreateUserForm />
      </div>

      <Suspense fallback={<div className="text-sm text-muted">Loading filters…</div>}>
        <UsersFilters
          initialQ={q}
          initialRole={role}
          initialStatus={status}
        />
      </Suspense>

      {list.users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">No users match these filters</p>
          <p className="mt-2 text-sm text-muted">
            Clear filters or add a new user to get started.
          </p>
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.users.map((user) => (
              <RecordCard
                key={user.id}
                title={user.full_name}
                subtitle={user.email}
                badge={<ActiveBadge active={user.is_active} />}
                fields={[
                  { label: "Phone", value: user.phone ?? "—" },
                  { label: "Role", value: <RoleBadge role={user.role} /> },
                  {
                    label: "Password",
                    value: <PasswordFlagBadge required={user.must_change_password} />,
                  },
                  { label: "Created", value: formatDate(user.created_at) },
                ]}
                action={
                  <ListActionLink href={`/app/admin/users/${user.id}`}>
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
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Password</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.users.map((user) => (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted">{user.email}</td>
                    <td className="px-4 py-3 text-muted">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={user.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <PasswordFlagBadge required={user.must_change_password} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/admin/users/${user.id}`}
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

          <ListPager
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            shown={list.users.length}
            noun="user"
            prevHref={
              list.page > 1
                ? buildPageHref("/app/admin/users", list.page - 1, {
                    q,
                    role,
                    status,
                  })
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/admin/users", list.page + 1, {
                    q,
                    role,
                    status,
                  })
                : null
            }
          />
        </>
      )}
    </section>
  );
}

function Header() {
  return (
    <div>
      <h2 className="font-display text-2xl tracking-tight text-ink">User management</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Create and manage administrator, staff, and driver accounts. Temporary passwords
        are never saved in application records—deliver them securely out-of-band.
      </p>
    </div>
  );
}
