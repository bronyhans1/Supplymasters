import "server-only";

import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Database } from "@/types/database";
import { listDriversQuerySchema, type ListDriversQuery } from "./schemas";

export const DRIVERS_PAGE_SIZE = 20;

export type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

export type ListDriversResult = {
  drivers: DriverRow[];
  total: number;
  page: number;
  pageSize: number;
  query: ListDriversQuery;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,.()]/g, " ").trim();
}

export async function listDrivers(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ListDriversResult> {
  await requireAdmin();

  const parsed = listDriversQuerySchema.parse({
    q: typeof rawQuery.q === "string" ? rawQuery.q : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "ALL",
    page: typeof rawQuery.page === "string" ? rawQuery.page : "1",
  });

  const supabase = await createClient();
  const from = (parsed.page - 1) * DRIVERS_PAGE_SIZE;
  const to = from + DRIVERS_PAGE_SIZE - 1;

  let query = supabase
    .from("drivers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.status === "ACTIVE") query = query.eq("is_active", true);
  if (parsed.status === "INACTIVE") query = query.eq("is_active", false);

  const safe = sanitizeSearch(parsed.q);
  if (safe) {
    const term = `%${safe}%`;
    query = query.or(
      `driver_code.ilike.${term},full_name.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(500, "DRIVER_LIST_FAILED", "Unable to load drivers.");
  }

  return {
    drivers: (data ?? []) as DriverRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: DRIVERS_PAGE_SIZE,
    query: parsed,
  };
}

export async function getDriver(driverId: string): Promise<DriverRow> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "DRIVER_LOOKUP_FAILED", "Unable to load that driver.");
  }
  if (!data) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver not found.");
  }
  return data as DriverRow;
}
