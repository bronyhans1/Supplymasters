import { AccessRestricted } from "@/components/app/AccessRestricted";
import { roleHomePath } from "@/lib/auth/access";
import { getCurrentProfile } from "@/lib/auth/session";

/**
 * Rendered when forbidden() is invoked (e.g. STAFF hitting ADMIN-only pages).
 * Nested under /app layout so AppShell + sidebar remain visible.
 */
export default async function AppForbiddenPage() {
  const profile = await getCurrentProfile();
  const dashboardHref = profile ? roleHomePath(profile.role) : "/app";

  return <AccessRestricted dashboardHref={dashboardHref} />;
}
