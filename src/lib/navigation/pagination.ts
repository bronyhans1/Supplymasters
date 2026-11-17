/**
 * Pure pagination URL helper — safe for Server and Client Components.
 * Keep this module free of client directives and React hooks.
 */
export function buildPageHref(
  basePath: string,
  page: number,
  params: Record<string, string | string[] | undefined>,
  options?: { omitKeys?: string[] },
): string {
  const search = new URLSearchParams();
  const omit = new Set(["page", ...(options?.omitKeys ?? [])]);
  for (const [key, value] of Object.entries(params)) {
    if (omit.has(key)) continue;
    if (typeof value === "string" && value && value !== "ALL") {
      search.set(key, value);
    }
  }
  search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
