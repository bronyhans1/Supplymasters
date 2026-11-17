import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/auth/access";
import { hasRequiredRole } from "@/lib/auth/roles";
import { requireAuth } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAuth();

  if (!hasRequiredRole(profile.role, ["ADMIN"])) {
    redirect(roleHomePath(profile.role));
  }

  return children;
}
