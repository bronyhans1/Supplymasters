import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { Profile } from "@/types/profile";
import { listUsersQuerySchema, type ListUsersQuery } from "./schemas";

export const USERS_PAGE_SIZE = 20;

export type ListedUser = Profile;

export type ListUsersResult = {
  users: ListedUser[];
  total: number;
  page: number;
  pageSize: number;
  query: ListUsersQuery;
};

export async function listUsersForAdmin(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListUsersResult> {
  await requireAdmin();

  const parsed = listUsersQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    role: typeof rawQuery.role === "string" ? rawQuery.role : "ALL",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * USERS_PAGE_SIZE;
  const to = from + USERS_PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_active, must_change_password, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.role !== "ALL") {
    query = query.eq("role", parsed.role);
  }

  if (parsed.status === "ACTIVE") {
    query = query.eq("is_active", true);
  } else if (parsed.status === "INACTIVE") {
    query = query.eq("is_active", false);
  }

  if (parsed.q) {
    // Strip PostgREST filter metacharacters so `.or()` values stay well-formed.
    const safe = parsed.q.replace(/[%_,.()]/g, " ").trim();
    if (safe) {
      const term = `%${safe}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, "USER_LIST_FAILED", "Unable to load users.");
  }

  return {
    users: (data ?? []) as ListedUser[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: USERS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getUserForAdmin(userId: string): Promise<ListedUser> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_active, must_change_password, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "USER_LOOKUP_FAILED", "Unable to load that user.");
  }

  if (!data) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  return data as ListedUser;
}
