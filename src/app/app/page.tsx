import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/auth/access";
import { requireAuth } from "@/lib/auth/session";

export default async function AppHomePage() {
  const { profile } = await requireAuth();
  redirect(roleHomePath(profile.role));
}
